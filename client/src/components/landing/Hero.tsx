import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Badge, Button } from '@/components/ui';
import { fadeUp } from '@/lib/motion';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-neutral-950 text-white">
      <div className="mx-auto grid min-h-[34rem] max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <Badge variant="primary">Spring collection</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Quiet luxury, made for everyday life.
          </h1>
          <p className="mt-4 max-w-md text-base text-neutral-300 sm:text-lg">
            Furniture, objects, and apparel designed with restraint. Free shipping over $75, two-day
            delivery in select cities.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/products">
              <Button size="lg" className="w-full sm:w-auto">
                Shop the collection
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/products?sort=createdAt">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 sm:w-auto dark:hover:bg-white/10"
              >
                View new arrivals
              </Button>
            </Link>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative"
        >
          <OptimizedImage
            src={HERO_IMAGE}
            alt="Sunlit boutique interior with clothing racks and a wooden table of lifestyle products"
            width={1200}
            height={900}
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="shadow-popover aspect-[4/3] w-full rounded-2xl object-cover"
          />
          <div className="shadow-card absolute right-4 bottom-4 rounded-2xl bg-white/90 px-4 py-3 text-neutral-900 backdrop-blur dark:bg-neutral-950/90 dark:text-white">
            <p className="text-xs text-neutral-500">Editor’s pick</p>
            <p className="text-sm font-semibold">Atelier daybed · from $890</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
