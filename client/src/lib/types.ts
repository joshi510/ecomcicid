export type UserRole = 'CUSTOMER' | 'ADMIN';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message: string;
  error: null;
};

export type ApiFailure = {
  success: false;
  data: unknown;
  message: string;
  error: { code: string; details?: unknown };
};

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  product: {
    id: string;
    name: string;
    slug: string;
    sku?: string;
    price: string;
    images: string[];
    stockQuantity: number;
    isActive?: boolean;
  };
};

export type Cart = {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: string;
  cartToken?: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string | null;
  stockQuantity?: number;
  sku?: string;
  images: string[];
  categoryId?: string;
  isActive?: boolean;
  category?: { id: string; name: string; slug: string };
};

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string };
};

export type ProductDetail = Product & {
  reviews: Review[];
  reviewSummary: { average: number; count: number };
  relatedProducts: Product[];
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: Category[];
};

export type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus | string;
  subtotal: string;
  discountAmount: string;
  shippingAmount: string;
  taxAmount: string;
  total: string;
  currency: string;
  coupon: { id: string; code: string } | null;
  shippingSnapshot: Record<string, string | null>;
  billingSnapshot: Record<string, string | null>;
  items: Array<{
    id: string;
    name: string;
    sku: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
  }>;
  user?: { id: string; name: string; email: string };
  statusHistory?: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }>;
  createdAt: string;
};

export type Address = {
  id: string;
  type: 'SHIPPING' | 'BILLING';
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  orderCount: number;
  totalSpent: string;
};
