import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { AppError } from '../utils/ApiError.js';
import { paginationArgs, paginationMeta, type PaginationMeta } from '../utils/pagination.js';
import { slugify } from '../utils/slugify.js';

const RELATED_LIMIT = 8;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const productListSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  compareAtPrice: true,
  stockQuantity: true,
  sku: true,
  images: true,
  categoryId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: { id: true, name: true, slug: true },
  },
} satisfies Prisma.ProductSelect;

export type SerializedProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string | null;
  stockQuantity: number;
  sku: string;
  images: string[];
  categoryId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string; slug: string };
};

function serializeProduct(
  product: Prisma.ProductGetPayload<{ select: typeof productListSelect }>,
): SerializedProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price.toString(),
    compareAtPrice: product.compareAtPrice?.toString() ?? null,
    stockQuantity: product.stockQuantity,
    sku: product.sku,
    images: product.images,
    categoryId: product.categoryId,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    category: product.category,
  };
}

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

async function uniqueProductSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base);
  let slug = root;
  let suffix = 1;

  while (
    await prisma.product.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    slug = `${root}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function assertCategoryExists(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });

  if (!category) {
    throw new AppError(400, 'Category not found', 'INVALID_CATEGORY');
  }
}

async function resolveCategoryFilter(category?: string) {
  if (!category) {
    return undefined;
  }

  if (UUID_RE.test(category)) {
    return { categoryId: category };
  }

  const match = await prisma.category.findUnique({
    where: { slug: category },
    select: { id: true },
  });

  return { categoryId: match?.id ?? '__none__' };
}

export async function listProducts(input: {
  page: number;
  limit: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort: 'price' | 'name' | 'createdAt' | 'created_at' | 'popularity';
  order: 'asc' | 'desc';
  minRating?: number;
  includeInactive?: boolean;
  isAdmin: boolean;
}): Promise<{ products: SerializedProduct[]; pagination: PaginationMeta }> {
  const categoryFilter = await resolveCategoryFilter(input.category);
  const sortField = input.sort === 'created_at' ? 'createdAt' : input.sort;

  const where: Prisma.ProductWhereInput = {
    ...(input.includeInactive && input.isAdmin ? {} : { isActive: true }),
    ...categoryFilter,
    ...(input.minRating
      ? { reviews: { some: { rating: { gte: input.minRating } } } }
      : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: 'insensitive' } },
            { description: { contains: input.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(input.minPrice !== undefined || input.maxPrice !== undefined
      ? {
          price: {
            ...(input.minPrice !== undefined ? { gte: toDecimal(input.minPrice) } : {}),
            ...(input.maxPrice !== undefined ? { lte: toDecimal(input.maxPrice) } : {}),
          },
        }
      : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      ...paginationArgs(input),
      orderBy:
        sortField === 'popularity'
          ? { reviews: { _count: input.order } }
          : { [sortField]: input.order },
      select: productListSelect,
    }),
  ]);

  return {
    products: rows.map(serializeProduct),
    pagination: paginationMeta(total, input.page, input.limit),
  };
}

export async function getProductBySlug(slug: string, isAdmin: boolean) {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      ...productListSelect,
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 40,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!product || (!product.isActive && !isAdmin)) {
    throw new AppError(404, 'Product not found', 'NOT_FOUND');
  }

  const [relatedRows, reviewAgg] = await Promise.all([
    prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        isActive: true,
        NOT: { id: product.id },
      },
      take: RELATED_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: productListSelect,
    }),
    prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const { reviews, ...rest } = product;

  return {
    ...serializeProduct(rest),
    reviews,
    reviewSummary: {
      average: Number((reviewAgg._avg.rating ?? 0).toFixed(2)),
      count: reviewAgg._count._all,
    },
    relatedProducts: relatedRows.map(serializeProduct),
  };
}

export async function createProduct(input: {
  name: string;
  slug?: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity?: number;
  sku: string;
  categoryId: string;
  isActive?: boolean;
  images?: string[];
  uploadedImages: string[];
}) {
  await assertCategoryExists(input.categoryId);

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug: await uniqueProductSlug(input.slug ?? input.name),
      description: input.description,
      price: toDecimal(input.price),
      compareAtPrice:
        input.compareAtPrice !== undefined ? toDecimal(input.compareAtPrice) : undefined,
      stockQuantity: input.stockQuantity ?? 0,
      sku: input.sku,
      categoryId: input.categoryId,
      isActive: input.isActive ?? true,
      images: [...(input.images ?? []), ...input.uploadedImages],
    },
    select: productListSelect,
  });

  return serializeProduct(product);
}

export async function updateProduct(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string;
    price?: number;
    compareAtPrice?: number;
    stockQuantity?: number;
    sku?: string;
    categoryId?: string;
    isActive?: boolean;
    images?: string[];
    replaceImages?: boolean;
    uploadedImages: string[];
  },
) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, images: true, price: true, compareAtPrice: true },
  });

  if (!existing) {
    throw new AppError(404, 'Product not found', 'NOT_FOUND');
  }

  if (input.categoryId) {
    await assertCategoryExists(input.categoryId);
  }

  const nextPrice = input.price !== undefined ? input.price : Number(existing.price.toString());
  const nextCompare =
    input.compareAtPrice !== undefined
      ? input.compareAtPrice
      : existing.compareAtPrice
        ? Number(existing.compareAtPrice.toString())
        : undefined;

  if (nextCompare !== undefined && nextCompare <= nextPrice) {
    throw new AppError(400, 'compareAtPrice must be greater than price', 'VALIDATION_ERROR');
  }

  let images = existing.images;
  if (input.replaceImages) {
    images = [...(input.images ?? []), ...input.uploadedImages];
  } else if (input.images || input.uploadedImages.length > 0) {
    images = [...existing.images, ...(input.images ?? []), ...input.uploadedImages];
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      slug: input.slug ? await uniqueProductSlug(input.slug, id) : undefined,
      description: input.description,
      price: input.price !== undefined ? toDecimal(input.price) : undefined,
      compareAtPrice:
        input.compareAtPrice !== undefined ? toDecimal(input.compareAtPrice) : undefined,
      stockQuantity: input.stockQuantity,
      sku: input.sku,
      categoryId: input.categoryId,
      isActive: input.isActive,
      images,
    },
    select: productListSelect,
  });

  return serializeProduct(product);
}

export async function softDeleteProduct(id: string) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });

  if (!existing) {
    throw new AppError(404, 'Product not found', 'NOT_FOUND');
  }

  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false },
    select: productListSelect,
  });

  return serializeProduct(product);
}
