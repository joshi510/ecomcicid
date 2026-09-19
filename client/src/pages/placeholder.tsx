import { Card, CardTitle } from '@/components/ui';

export function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">Coming next</p>
      <CardTitle className="mt-2 text-2xl">{title}</CardTitle>
      <p className="mt-2 max-w-xl text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
    </Card>
  );
}
