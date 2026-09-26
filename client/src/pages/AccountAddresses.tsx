import { useEffect, useState, type FormEvent } from 'react';
import { Badge, Button, Card, Input, Modal } from '@/components/ui';
import { apiGet, apiSend, getApiError } from '@/lib/api';
import { deleteLocalAddress, isApiOffline, listLocalAddresses, saveLocalAddress } from '@/lib/offline';
import type { Address } from '@/lib/types';
import { toast } from '@/store/ui.store';

const emptyForm = {
  type: 'SHIPPING' as Address['type'],
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  phone: '',
  isDefault: false,
};

export default function AccountAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () =>
    apiGet<{ addresses: Address[] }>('/addresses')
      .then((data) => setAddresses(data.addresses))
      .catch(() => setAddresses(listLocalAddresses()));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (address: Address) => {
    setEditing(address);
    setForm({
      type: address.type,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      state: address.state ?? '',
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone ?? '',
      isDefault: address.isDefault,
    });
    setOpen(true);
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const body = {
      ...form,
      line2: form.line2 || undefined,
      state: form.state || undefined,
      phone: form.phone || undefined,
    };
    try {
      if (editing) {
        await apiSend(`/addresses/${editing.id}`, body, 'put');
        toast({ variant: 'success', title: 'Address updated' });
      } else {
        await apiSend('/addresses', body);
        toast({ variant: 'success', title: 'Address saved' });
      }
      setOpen(false);
      await load();
    } catch (error) {
      if (isApiOffline(error)) {
        saveLocalAddress({ ...body, id: editing?.id });
        toast({ variant: 'success', title: editing ? 'Address updated' : 'Address saved' });
        setOpen(false);
        await load();
        return;
      }
      toast({ variant: 'error', title: 'Could not save address', message: getApiError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await apiSend(`/addresses/${id}`, undefined, 'delete');
      toast({ variant: 'success', title: 'Address removed' });
      await load();
    } catch (error) {
      if (isApiOffline(error)) {
        deleteLocalAddress(id);
        toast({ variant: 'success', title: 'Address removed' });
        await load();
        return;
      }
      toast({ variant: 'error', title: 'Could not delete address', message: getApiError(error) });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Addresses</h1>
          <p className="mt-1 text-sm text-neutral-500">Shipping and billing destinations.</p>
        </div>
        <Button onClick={openCreate}>Add address</Button>
      </div>
      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : addresses.length === 0 ? (
        <p className="text-sm text-neutral-500">No saved addresses yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id} className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Badge>{address.type}</Badge>
                {address.isDefault ? <Badge variant="primary">Default</Badge> : null}
              </div>
              <p className="text-sm leading-6">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}
                <br />
                {address.city}
                {address.state ? `, ${address.state}` : ''} {address.postalCode}
                <br />
                {address.country}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(address)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void remove(address.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title={editing ? 'Edit address' : 'Add address'}
        onClose={() => setOpen(false)}
      >
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium">Type</span>
            <select
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value as Address['type'] }))
              }
            >
              <option value="SHIPPING">Shipping</option>
              <option value="BILLING">Billing</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <Input
              label="Address"
              value={form.line1}
              onChange={(event) => setForm((current) => ({ ...current, line1: event.target.value }))}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Apartment (optional)"
              value={form.line2}
              onChange={(event) => setForm((current) => ({ ...current, line2: event.target.value }))}
            />
          </div>
          <Input
            label="City"
            value={form.city}
            onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            required
          />
          <Input
            label="State"
            value={form.state}
            onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
          />
          <Input
            label="Postal code"
            value={form.postalCode}
            onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))}
            required
          />
          <Input
            label="Country"
            value={form.country}
            onChange={(event) =>
              setForm((current) => ({ ...current, country: event.target.value.toUpperCase() }))
            }
            required
          />
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isDefault: event.target.checked }))
                }
              />
              Default address
            </label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save address'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
