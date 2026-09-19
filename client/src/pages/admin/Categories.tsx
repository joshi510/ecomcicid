import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input, Modal } from '@/components/ui';
import { apiGet, apiSend, getApiError } from '@/lib/api';
import type { Category } from '@/lib/types';
import { toast } from '@/store/ui.store';

function flatten(categories: Category[], depth = 0): Array<Category & { depth: number }> {
  return categories.flatMap((category) => [
    { ...category, depth },
    ...flatten(category.children ?? [], depth + 1),
  ]);
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Array<Category & { depth: number }>>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    apiGet<{ categories: Category[] }>('/categories')
      .then((data) => setCategories(flatten(data.categories)))
      .catch(() => setCategories([]));

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setParentId('');
    setOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setParentId(category.parentId ?? '');
    setOpen(true);
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const body = { name, parentId: parentId || null };
    try {
      if (editing) {
        await apiSend(`/categories/${editing.id}`, body, 'put');
        toast({ variant: 'success', title: 'Category updated' });
      } else {
        await apiSend('/categories', body);
        toast({ variant: 'success', title: 'Category created' });
      }
      setOpen(false);
      await load();
    } catch (error) {
      toast({ variant: 'error', title: 'Could not save category', message: getApiError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await apiSend(`/categories/${id}`, undefined, 'delete');
      toast({ variant: 'success', title: 'Category deleted' });
      await load();
    } catch (error) {
      toast({ variant: 'error', title: 'Could not delete category', message: getApiError(error) });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-neutral-500">Organize the catalog tree.</p>
        </div>
        <Button onClick={openCreate}>Add category</Button>
      </div>
      <Card className="p-0">
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Slug</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-5 py-3" style={{ paddingLeft: `${20 + category.depth * 16}px` }}>
                  {category.name}
                </td>
                <td className="px-5 py-3 text-neutral-500">{category.slug}</td>
                <td className="px-5 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(category)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void remove(category.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal
        open={open}
        title={editing ? 'Edit category' : 'Add category'}
        onClose={() => setOpen(false)}
      >
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Parent</span>
            <select
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">None</option>
              {categories
                .filter((category) => category.id !== editing?.id)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
