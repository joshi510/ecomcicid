import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Living', slug: 'living' },
  { name: 'Apparel', slug: 'apparel' },
  { name: 'Objects', slug: 'objects' },
  { name: 'Wellness', slug: 'wellness' },
];

const products = [
  {
    name: 'Linen lounge chair',
    slug: 'linen-lounge-chair',
    description:
      'A low, sculptural lounge chair in undyed linen and solid oak. Built for slow evenings.',
    price: 640,
    compareAtPrice: 780,
    stockQuantity: 12,
    sku: 'NL-LIV-001',
    categorySlug: 'living',
    images: [
      'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    name: 'Ceramic pour-over set',
    slug: 'ceramic-pour-over-set',
    description: 'Stoneware dripper and carafe with a matte glaze. Fits a standard paper filter.',
    price: 86,
    compareAtPrice: null,
    stockQuantity: 40,
    sku: 'NL-OBJ-002',
    categorySlug: 'objects',
    images: [
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    name: 'Wool throw blanket',
    slug: 'wool-throw-blanket',
    description: 'Heavyweight merino throw with hand-finished edges. 140 × 200 cm.',
    price: 128,
    compareAtPrice: null,
    stockQuantity: 28,
    sku: 'NL-LIV-003',
    categorySlug: 'living',
    images: [
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    name: 'Oak side table',
    slug: 'oak-side-table',
    description: 'A compact white-oak table with a rounded top and a single open shelf.',
    price: 320,
    compareAtPrice: 390,
    stockQuantity: 9,
    sku: 'NL-LIV-004',
    categorySlug: 'living',
    images: [
      'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    name: 'Atelier daybed',
    slug: 'atelier-daybed',
    description: 'Daybed with a slim oak frame and removable linen cover. Editor’s pick from $890.',
    price: 890,
    compareAtPrice: null,
    stockQuantity: 4,
    sku: 'NL-LIV-005',
    categorySlug: 'living',
    images: [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    name: 'Organic cotton overshirt',
    slug: 'organic-cotton-overshirt',
    description: 'Unstructured overshirt in heavy organic cotton. Relaxed fit.',
    price: 165,
    compareAtPrice: null,
    stockQuantity: 22,
    sku: 'NL-APP-006',
    categorySlug: 'apparel',
    images: [
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80',
    ],
  },
];

async function main() {
  const categoryIds = new Map<string, string>();

  for (const category of categories) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
    categoryIds.set(category.slug, row.id);
  }

  for (const product of products) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) continue;
    const { categorySlug: _categorySlug, ...data } = product;
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: { ...data, categoryId, isActive: true },
      create: { ...data, categoryId, isActive: true },
    });
  }
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    await prisma.$disconnect();
    process.exit(1);
  });
