import type { Category, Pagination, Product, ProductDetail } from '@/lib/types';

type CatalogFile = {
  categories: Category[];
  products: Array<Product & { createdAt?: string }>;
};

type ProductListQuery = {
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: string;
  order?: string;
};

let cached: Promise<CatalogFile> | null = null;

export async function loadCatalog() {
  if (!cached) {
    cached = fetch('/catalog.json').then(async (response) => {
      if (!response.ok) {
        throw new Error('Catalog is unavailable');
      }
      return (await response.json()) as CatalogFile;
    });
  }
  return cached;
}

export async function listCatalogCategories() {
  const catalog = await loadCatalog();
  return { categories: catalog.categories };
}

export async function listCatalogProducts(query: ProductListQuery) {
  const catalog = await loadCatalog();
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(48, Math.max(1, query.limit ?? 12));
  const minPrice = query.minPrice ?? 0;
  const maxPrice = query.maxPrice ?? Number.POSITIVE_INFINITY;
  const search = query.search?.trim().toLowerCase() ?? '';
  const category = query.category?.trim() ?? '';
  const order = query.order === 'asc' ? 1 : -1;

  let products = catalog.products.filter((product) => {
    const price = Number(product.price);
    if (price < minPrice || price > maxPrice) return false;
    if (category && product.category?.slug !== category && product.categoryId !== category) {
      return false;
    }
    if (
      search &&
      !product.name.toLowerCase().includes(search) &&
      !product.description.toLowerCase().includes(search)
    ) {
      return false;
    }
    return product.isActive !== false;
  });

  products = [...products].sort((a, b) => {
    if (query.sort === 'price') {
      return (Number(a.price) - Number(b.price)) * order;
    }
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return (aTime - bTime) * order;
  });

  const total = products.length;
  const start = (page - 1) * limit;
  const pagination: Pagination = {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };

  return { products: products.slice(start, start + limit), pagination };
}

export async function getCatalogProduct(slug: string): Promise<ProductDetail> {
  const catalog = await loadCatalog();
  const product = catalog.products.find((item) => item.slug === slug);
  if (!product) {
    throw new Error('Product not found');
  }

  const relatedProducts = catalog.products
    .filter((item) => item.slug !== slug && item.categoryId === product.categoryId)
    .slice(0, 8);

  return {
    ...product,
    reviews: [],
    reviewSummary: { average: 0, count: 0 },
    relatedProducts,
  };
}
