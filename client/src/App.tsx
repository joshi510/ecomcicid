import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminRoute } from '@/components/AdminRoute';
import { AccountLayout } from '@/components/layout/AccountLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Skeleton } from '@/components/ui';

const Home = lazy(() => import('@/pages/Home'));
const Products = lazy(() => import('@/pages/Products'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Account = lazy(() => import('@/pages/Account'));
const AccountOrders = lazy(() => import('@/pages/AccountOrders'));
const AccountOrderDetail = lazy(() => import('@/pages/AccountOrderDetail'));
const AccountAddresses = lazy(() => import('@/pages/AccountAddresses'));
const AccountWishlist = lazy(() => import('@/pages/AccountWishlist'));
const StyleGuide = lazy(() => import('@/pages/StyleGuide'));
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('@/pages/admin/Products'));
const AdminOrders = lazy(() => import('@/pages/admin/Orders'));
const AdminCustomers = lazy(() => import('@/pages/admin/Customers'));
const AdminCustomerDetail = lazy(() => import('@/pages/admin/CustomerDetail'));
const AdminCategories = lazy(() => import('@/pages/admin/Categories'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-3 px-4 py-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders/:id/confirmed" element={<OrderConfirmation />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AccountLayout />}>
              <Route path="/account" element={<Account />} />
              <Route path="/account/orders" element={<AccountOrders />} />
              <Route path="/account/orders/:id" element={<AccountOrderDetail />} />
              <Route path="/account/addresses" element={<AccountAddresses />} />
              <Route path="/account/wishlist" element={<AccountWishlist />} />
            </Route>
          </Route>
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/customers" element={<AdminCustomers />} />
            <Route path="/admin/customers/:id" element={<AdminCustomerDetail />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route path="/styleguide" element={<StyleGuide />} />
      </Routes>
    </Suspense>
  );
}
