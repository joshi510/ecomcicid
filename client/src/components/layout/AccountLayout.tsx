import { NavLink, Outlet } from 'react-router-dom';
import { Seo } from '@/components/Seo';

const links = [
  { to: '/account', label: 'Profile', end: true },
  { to: '/account/orders', label: 'Orders', end: false },
  { to: '/account/addresses', label: 'Addresses', end: false },
  { to: '/account/wishlist', label: 'Wishlist', end: false },
];

export function AccountLayout() {
  return (
    <div className="grid gap-8 md:grid-cols-[200px_1fr]">
      <Seo title="Account" description="Manage your Northline account." path="/account" noindex />
      <aside className="space-y-1">
        <p className="mb-3 px-3 text-xs font-medium tracking-wide text-neutral-400 uppercase">
          Account
        </p>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `block rounded-xl px-3 py-2 text-sm ${
                isActive
                  ? 'bg-neutral-100 font-medium dark:bg-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </aside>
      <Outlet />
    </div>
  );
}
