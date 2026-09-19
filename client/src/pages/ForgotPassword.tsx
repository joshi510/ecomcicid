import { type FormEvent, useState } from 'react';
import { Seo } from '@/components/Seo';
import { Button, Card, Input } from '@/components/ui';
import { apiSend } from '@/lib/api';
import { toast } from '@/store/ui.store';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiSend('/auth/forgot-password', { email });
      toast({
        variant: 'success',
        title: 'Check your inbox',
        message: 'If that email exists, reset instructions were sent.',
      });
    } catch {
      toast({ variant: 'error', title: 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Seo title="Reset password" description="Reset your Northline account password." path="/forgot-password" noindex />
      <Card>
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
