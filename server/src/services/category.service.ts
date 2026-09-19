import type { Category } from '@prisma/client';
import { prisma } from '../prisma/client.js';
import { AppError } from '../utils/ApiError.js';
import { paginationArgs, paginationMeta, type PaginationMeta } from '../utils/pagination.js';
import { slugify } from '../utils/slugify.js';

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryNode[];
};

async function uniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base);
  let slug = root;
  let suffix = 1;

  while (
    await prisma.category.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    slug = `${root}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function assertParentExists(parentId: string | null | undefined) {
  if (!parentId) {
    return;
  }

  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { id: true },
  });

  if (!parent) {
    throw new AppError(400, 'Parent category not found', 'INVALID_PARENT');
  }
}

async function assertNoCycle(id: string, parentId: string) {
  if (parentId === id) {
    throw new AppError(400, 'A category cannot be its own parent', 'INVALID_PARENT');
  }

  let currentId: string | null = parentId;
  while (currentId) {
    if (currentId === id) {
      throw new AppError(400, 'Cannot set a descendant as the parent category', 'INVALID_PARENT');
    }

    const current: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }
}

function toNode(category: Category, children: CategoryNode[] = []): CategoryNode {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    children,
  };
}

function buildTree(categories: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>();
  for (const category of categories) {
    nodes.set(category.id, toNode(category));
  }

  const roots: CategoryNode[] = [];
  for (const category of categories) {
    const node = nodes.get(category.id)!;
    if (category.parentId && nodes.has(category.parentId)) {
      nodes.get(category.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function listCategories(input: {
  flat?: boolean;
  page: number;
  limit: number;
}): Promise<{
  categories: CategoryNode[] | Omit<CategoryNode, 'children'>[];
  pagination?: PaginationMeta;
}> {
  if (!input.flat) {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return { categories: buildTree(categories) };
  }

  const [total, rows] = await prisma.$transaction([
    prisma.category.count(),
    prisma.category.findMany({
      ...paginationArgs(input),
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    categories: rows.map((category) => {
      const { children: _children, ...rest } = toNode(category);
      return rest;
    }),
    pagination: paginationMeta(total, input.page, input.limit),
  };
}

export async function createCategory(input: {
  name: string;
  slug?: string;
  parentId?: string | null;
}) {
  await assertParentExists(input.parentId);

  return prisma.category.create({
    data: {
      name: input.name,
      slug: await uniqueCategorySlug(input.slug ?? input.name),
      parentId: input.parentId ?? null,
    },
  });
}

export async function updateCategory(
  id: string,
  input: { name?: string; slug?: string; parentId?: string | null },
) {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError(404, 'Category not found', 'NOT_FOUND');
  }

  if (input.parentId) {
    await assertParentExists(input.parentId);
    await assertNoCycle(id, input.parentId);
  }

  return prisma.category.update({
    where: { id },
    data: {
      name: input.name,
      slug: input.slug ? await uniqueCategorySlug(input.slug, id) : undefined,
      parentId: input.parentId,
    },
  });
}

export async function deleteCategory(id: string) {
  const existing = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      _count: { select: { children: true, products: true } },
    },
  });

  if (!existing) {
    throw new AppError(404, 'Category not found', 'NOT_FOUND');
  }

  if (existing._count.children > 0 || existing._count.products > 0) {
    throw new AppError(
      409,
      'Cannot delete a category that still has subcategories or products',
      'CATEGORY_IN_USE',
    );
  }

  await prisma.category.delete({ where: { id } });
  return { id };
}
