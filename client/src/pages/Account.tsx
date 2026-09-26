import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, Input } from '@/components/ui';
import { apiSend, getApiError } from '@/lib/api';
import { isApiOffline, updateLocalUser } from '@/lib/offline';
import type { User } from '@/lib/types';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';

export default function Account() {
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await apiSend<{ user: User }>('/auth/me', { name, email }, 'patch');
      if (accessToken) setSession(data.user, accessToken);
      toast({ variant: 'success', title: 'Profile updated' });
    } catch (error) {
      if (isApiOffline(error) && user?.id) {
        try {
          const updated = updateLocalUser(user.id, { name, email });
          if (accessToken) setSession(updated.user, accessToken);
          toast({ variant: 'success', title: 'Profile updated' });
          return;
        } catch {
          // fallback
        }
      }
      toast({ variant: 'error', title: 'Could not update profile', message: getApiError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage how Northline addresses you.</p>
      </div>
      <Card>
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-neutral-500">Signed in as {user?.email}</p>
          <Badge variant="primary">{user?.role}</Badge>
        </div>
        <form className="grid max-w-md gap-4" onSubmit={onSubmit}>
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearSession();
                toast({ variant: 'info', title: 'Signed out' });
              }}
            >
              Sign out
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
