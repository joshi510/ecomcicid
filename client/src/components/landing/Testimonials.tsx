import { motion } from 'framer-motion';
import { fadeUp, stagger } from '@/lib/motion';

const quotes = [
  {
    name: 'Maya Chen',
    role: 'Interior designer, Brooklyn',
    quote:
      'The pieces feel editorial without being precious. Clients notice the finish immediately.',
    image:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Jonah Ellis',
    role: 'Studio lead, Portland',
    quote: 'Checkout was the first time a store felt as calm as Linear. Delivery was two days.',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Priya Raman',
    role: 'Founder, Atelier Sol',
    quote: 'We furnished a pop-up entirely from Northline. The photography matches what arrived.',
    image:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=200&q=80',
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <p className="text-primary-600 text-sm font-medium">Social proof</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        Studios that switched
      </h2>
      <motion.div
        className="mt-8 grid gap-5 md:grid-cols-3"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={stagger}
      >
        {quotes.map((item) => (
          <motion.blockquote
            key={item.name}
            variants={fadeUp}
            className="shadow-card rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              “{item.quote}”
            </p>
            <footer className="mt-5 flex items-center gap-3">
              <img
                src={item.image}
                alt={`${item.name}, ${item.role}`}
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                className="size-10 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-neutral-500">{item.role}</p>
              </div>
            </footer>
          </motion.blockquote>
        ))}
      </motion.div>
    </section>
  );
}
