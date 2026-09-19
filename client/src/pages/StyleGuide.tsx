import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge, Button, Card, CardTitle, Dropdown, Input, Modal, Skeleton } from '@/components/ui';
import { toast } from '@/store/ui.store';

export default function StyleGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-10 dark:bg-neutral-950">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-primary-600 text-sm font-medium">Design system</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Northline UI</h1>
            <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-400">
              Stripe / Linear inspired primitives: Inter, indigo primary, soft cards, and
              class-based dark mode.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardTitle>Inputs</CardTitle>
            <div className="mt-4 space-y-3">
              <Input label="Email" placeholder="you@store.com" hint="We’ll never share this." />
              <Input label="Coupon" error="This code is expired." defaultValue="SAVE10" />
            </div>
          </Card>
          <Card>
            <CardTitle>Badges</CardTitle>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardTitle>Overlay</CardTitle>
            <div className="mt-4 flex gap-3">
              <Button onClick={() => setOpen(true)}>Open modal</Button>
              <Dropdown
                trigger={<Button variant="outline">Menu</Button>}
                items={[
                  {
                    label: 'Profile',
                    onSelect: () => toast({ variant: 'info', title: 'Profile' }),
                  },
                  {
                    label: 'Delete',
                    danger: true,
                    onSelect: () => toast({ variant: 'error', title: 'Deleted' }),
                  },
                ]}
              />
            </div>
          </Card>
          <Card>
            <CardTitle>Feedback</CardTitle>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  toast({ variant: 'success', title: 'Saved', message: 'Order notes updated.' })
                }
              >
                Success toast
              </Button>
              <Button
                variant="outline"
                onClick={() => toast({ variant: 'warning', title: 'Low stock' })}
              >
                Warning toast
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Card>
        </section>
      </div>

      <Modal open={open} title="Confirm fulfillment" onClose={() => setOpen(false)}>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          This ships the order and emails the customer a tracking number.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Confirm</Button>
        </div>
      </Modal>
    </div>
  );
}
