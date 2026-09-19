import { Link } from 'react-router-dom';
import { Instagram, Twitter, Youtube } from 'lucide-react';

const columns = [
  {
    title: 'Shop',
    links: [
      { to: '/products', label: 'All products' },
      { to: '/products?sort=createdAt', label: 'New arrivals' },
      { to: '/cart', label: 'Cart' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/', label: 'About' },
      { to: '/styleguide', label: 'Design system' },
      { to: '/account', label: 'Account' },
    ],
  },
  {
    title: 'Support',
    links: [
      { to: '/login', label: 'Sign in' },
      { to: '/register', label: 'Create account' },
      { to: '/forgot-password', label: 'Reset password' },
    ],
  },
];

function PayBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[10px] font-semibold tracking-wider text-neutral-600 uppercase dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
      {label}
    </span>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="text-sm font-semibold tracking-tight">Northline</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-500">
            Considered objects for modern living. Designed in New York, made to last, delivered
            worldwide.
          </p>
          <div className="mt-5 flex gap-3 text-neutral-500">
            <a
              href="https://instagram.com"
              aria-label="Instagram"
              className="hover:text-neutral-900 dark:hover:text-white"
            >
              <Instagram className="size-4" />
            </a>
            <a
              href="https://x.com"
              aria-label="X"
              className="hover:text-neutral-900 dark:hover:text-white"
            >
              <Twitter className="size-4" />
            </a>
            <a
              href="https://youtube.com"
              aria-label="YouTube"
              className="hover:text-neutral-900 dark:hover:text-white"
            >
              <Youtube className="size-4" />
            </a>
          </div>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-semibold tracking-wide text-neutral-900 uppercase dark:text-neutral-100">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-5 sm:flex-row sm:items-center">
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} Northline Commerce. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-2" aria-label="Accepted payment methods">
            <PayBadge label="Visa" />
            <PayBadge label="Mastercard" />
            <PayBadge label="Amex" />
            <PayBadge label="PayPal" />
            <PayBadge label="Stripe" />
          </div>
        </div>
      </div>
    </footer>
  );
}
