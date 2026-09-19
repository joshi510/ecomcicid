import { CategoryShowcase } from '@/components/landing/CategoryShowcase';
import { FeaturedProducts } from '@/components/landing/FeaturedProducts';
import { Hero } from '@/components/landing/Hero';
import { Newsletter } from '@/components/landing/Newsletter';
import { Testimonials } from '@/components/landing/Testimonials';
import { Seo } from '@/components/Seo';

export default function Home() {
  return (
    <>
      <Seo
        title="Quiet luxury for everyday life"
        description="Furniture, objects, and apparel designed with restraint. Free shipping over $75."
        path="/"
        image="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80&fm=webp"
      />
      <Hero />
      <FeaturedProducts />
      <CategoryShowcase />
      <Testimonials />
      <Newsletter />
    </>
  );
}
