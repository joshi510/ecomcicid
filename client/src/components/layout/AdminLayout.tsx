import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  FolderTree,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { Seo } from '@/components/Seo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthStore } from '@/store/auth.store';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package, end: false },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, end: false },
  { to: '/admin/customers', label: 'Customers', icon: Users, end: false },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
];

export function AdminLayout() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Seo title="Admin" description="Northline administration." path="/admin" noindex />
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-neutral-200 p-5 lg:border-r lg:border-b-0 dark:border-neutral-800">
          <Link to="/" className="mb-8 block text-sm font-semibold tracking-tight">
            Northline Admin
          </Link>
          <nav className="flex gap-1 overflow-x-auto lg:block lg:space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2 text-sm whitespace-nowrap ${
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900'
                  }`
                }
              >
                <link.icon className="size-4" />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div>
          <header className="flex h-14 items-center justify-between border-b border-neutral-200 px-6 dark:border-neutral-800">
            <p className="text-sm text-neutral-500">{user?.email}</p>
            <ThemeToggle />
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
