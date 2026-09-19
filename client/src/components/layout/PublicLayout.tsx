import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';

const nav = [{ to: '/products', label: 'Products' }];

export function PublicLayout() {
  const user = useAuthStore((state) => state.user);
  const cart = useCartStore((state) => state.cart);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const count = cart?.itemCount ?? 0;
  const isHome = useLocation().pathname === '/';

  useEffect(() => {
    void fetchCart();
  }, [fetchCart, user?.id]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:h-16">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Northline
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-neutral-100 font-medium dark:bg-neutral-900'
                      : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={openDrawer}
              className="rounded-xl px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              Cart{count > 0 ? ` (${count})` : ''}
            </button>
            <ThemeToggle />
            {user ? (
              <Link
                to={user.role === 'ADMIN' ? '/admin' : '/account'}
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium dark:border-neutral-800"
              >
                {user.role === 'ADMIN' ? 'Admin' : 'Account'}
              </Link>
            ) : (
              <Link
                to="/login"
                className="bg-primary-500 hover:bg-primary-600 rounded-xl px-3 py-2 text-sm font-medium text-white"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className={isHome ? 'flex-1' : 'mx-auto w-full max-w-6xl flex-1 px-4 py-10'}>
        <Outlet />
      </main>
      <SiteFooter />
      <CartDrawer />
    </div>
  );
}
