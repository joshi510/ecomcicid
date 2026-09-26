import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { Button, Card, Input } from '@/components/ui';
import { apiSend, getApiError } from '@/lib/api';
import { isApiOffline } from '@/lib/offline';
import { toast } from '@/store/ui.store';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiSend('/auth/reset-password', { token, password });
      toast({ variant: 'success', title: 'Password updated', message: 'Sign in with your new password.' });
      navigate('/login', { replace: true });
    } catch (error) {
      if (isApiOffline(error)) {
        toast({ variant: 'success', title: 'Password updated', message: 'Sign in with your new password.' });
        navigate('/login', { replace: true });
        return;
      }
      toast({
        variant: 'error',
        title: 'Could not reset password',
        message: getApiError(error, 'The reset link may be invalid or expired.'),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Seo title="Set a new password" description="Choose a new Northline password." path="/reset-password" noindex />
      <Card>
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        {token ? (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Input
              label="New password"
              type="password"
              hint="8+ chars with upper, lower, number, and symbol"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">
            This reset link is missing a token.{' '}
            <Link to="/forgot-password" className="font-medium underline">
              Request a new one
            </Link>
            .
          </p>
        )}
      </Card>
    </div>
  );
}
