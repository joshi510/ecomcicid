import { useEffect, useState, type FormEvent } from 'react';
import { Badge, Button, Input, Modal, Skeleton } from '@/components/ui';
import { apiForm, apiGet, apiSend, getApiError } from '@/lib/api';
import { formatPrice, mediaUrl } from '@/lib/media';
import type { Category, Pagination, Product } from '@/lib/types';
import { toast } from '@/store/ui.store';

type ProductForm = {
  name: string;
  description: string;
  price: string;
  compareAtPrice: string;
  stockQuantity: string;
  sku: string;
  categoryId: string;
  isActive: boolean;
};

const emptyForm: ProductForm = {
  name: '',
  description: '',
  price: '',
  compareAtPrice: '',
  stockQuantity: '0',
  sku: '',
  categoryId: '',
  isActive: true,
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = (nextPage = page, q = search) => {
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: '12',
      includeInactive: 'true',
      sort: 'createdAt',
      order: 'desc',
    });
    if (q) params.set('search', q);
    return apiGet<{ products: Product[]; pagination: Pagination }>(`/products?${params}`).then(
      (data) => {
        setProducts(data.products);
        setPagination(data.pagination);
      },
    );
  };

  useEffect(() => {
    apiGet<{ categories: Category[] }>('/categories?flat=true')
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    load(page, search).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when page changes; search is explicit
  }, [page]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? '' });
    setFiles(null);
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? '',
      stockQuantity: String(product.stockQuantity ?? 0),
      sku: product.sku ?? '',
      categoryId: product.categoryId ?? product.category?.id ?? '',
      isActive: product.isActive !== false,
    });
    setFiles(null);
    setOpen(true);
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const body = new FormData();
    body.append('name', form.name);
    body.append('description', form.description);
    body.append('price', form.price);
    if (form.compareAtPrice) body.append('compareAtPrice', form.compareAtPrice);
    body.append('stockQuantity', form.stockQuantity);
    body.append('sku', form.sku);
    body.append('categoryId', form.categoryId);
    body.append('isActive', String(form.isActive));
    if (files) {
      Array.from(files).forEach((file) => body.append('images', file));
      if (editing) body.append('replaceImages', 'true');
    }
    try {
      if (editing) {
        await apiForm(`/products/${editing.id}`, body, 'put');
        toast({ variant: 'success', title: 'Product updated' });
      } else {
        await apiForm('/products', body);
        toast({ variant: 'success', title: 'Product created' });
      }
      setOpen(false);
      await load();
    } catch (error) {
      toast({ variant: 'error', title: 'Could not save product', message: getApiError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await apiSend(`/products/${id}`, undefined, 'delete');
      toast({ variant: 'success', title: 'Product archived' });
      setConfirmId(null);
      await load();
    } catch (error) {
      toast({ variant: 'error', title: 'Could not delete product', message: getApiError(error) });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-neutral-500">{pagination?.total ?? 0} catalog items</p>
        </div>
        <Button onClick={openCreate}>Add product</Button>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setLoading(true);
          load(1, search).finally(() => setLoading(false));
        }}
      >
        <Input
          name="product-search"
          placeholder="Search name or description"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={mediaUrl(product.images[0])}
                        alt=""
                        className="size-10 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-neutral-500">{product.category?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{product.sku}</td>
                  <td className="px-4 py-3">{formatPrice(product.price)}</td>
                  <td className="px-4 py-3">{product.stockQuantity}</td>
                  <td className="px-4 py-3">
                    <Badge variant={product.isActive === false ? 'neutral' : 'success'}>
                      {product.isActive === false ? 'Archived' : 'Active'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(product)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(product.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pagination && pagination.totalPages > 1 ? (
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Modal
        open={open}
        title={editing ? 'Edit product' : 'Add product'}
        onClose={() => setOpen(false)}
        className="max-w-2xl"
      >
        <form className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2" onSubmit={onSubmit}>
          <div className="sm:col-span-2">
            <Input
              label="Name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Description</span>
              <textarea
                className="min-h-24 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                required
              />
            </label>
          </div>
          <Input
            label="Price"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
            required
          />
          <Input
            label="Compare-at price"
            type="number"
            step="0.01"
            value={form.compareAtPrice}
            onChange={(event) =>
              setForm((current) => ({ ...current, compareAtPrice: event.target.value }))
            }
          />
          <Input
            label="Stock"
            type="number"
            value={form.stockQuantity}
            onChange={(event) =>
              setForm((current) => ({ ...current, stockQuantity: event.target.value }))
            }
          />
          <Input
            label="SKU"
            value={form.sku}
            onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
            required
          />
          <label className="text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium">Category</span>
            <select
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
              value={form.categoryId}
              onChange={(event) =>
                setForm((current) => ({ ...current, categoryId: event.target.value }))
              }
              required
            >
              <option value="">Select…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium">Images</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(event) => setFiles(event.target.files)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
            Active
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save product'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(confirmId)} title="Archive product?" onClose={() => setConfirmId(null)}>
        <p className="text-sm text-neutral-600">
          This hides the product from the storefront. You can reactivate it later.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setConfirmId(null)}>
            Cancel
          </Button>
          <Button onClick={() => confirmId && void remove(confirmId)}>Archive</Button>
        </div>
      </Modal>
    </div>
  );
}
