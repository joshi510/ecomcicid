import { type FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Input } from '@/components/ui';
import { fadeUp } from '@/lib/motion';
import { toast } from '@/store/ui.store';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setEmail('');
      toast({
        variant: 'success',
        title: 'You’re on the list',
        message: 'New drops and studio notes, once a month.',
      });
    }, 400);
  }

  return (
    <section className="px-4 pb-16 sm:pb-20">
      <motion.div
        className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-neutral-950 px-6 py-12 text-white sm:px-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeUp}
      >
        <p className="text-primary-300 text-sm font-medium">Newsletter</p>
        <h2 className="mt-2 max-w-lg text-2xl font-semibold tracking-tight sm:text-3xl">
          Get the Saturday edit. No discount codes, just new work.
        </h2>
        <form
          className="mt-6 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={onSubmit}
        >
          <div className="flex-1">
            <Input
              aria-label="Email address"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@studio.com"
              className="border-neutral-700 bg-neutral-900 text-white placeholder:text-neutral-500"
            />
          </div>
          <Button type="submit" disabled={loading} className="sm:mb-0.5">
            {loading ? 'Joining…' : 'Subscribe'}
          </Button>
        </form>
      </motion.div>
    </section>
  );
}
