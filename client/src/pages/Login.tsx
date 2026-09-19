import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { Button, Card, Input } from '@/components/ui';
import { apiSend, getApiError } from '@/lib/api';
import type { User } from '@/lib/types';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await apiSend<{ user: User; accessToken: string }>('/auth/login', {
        email,
        password,
      });
      setSession(data.user, data.accessToken);
      toast({ variant: 'success', title: 'Signed in' });
      const from = (location.state as { from?: string } | null)?.from ?? '/account';
      navigate(from, { replace: true });
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Sign in failed',
        message: getApiError(error, 'Check your email and password.'),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Seo title="Sign in" description="Sign in to your Northline account." path="/login" />
      <Card>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-neutral-500">Sign in to your Northline account.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/register" className="text-primary-600">
            Create account
          </Link>
          <Link to="/forgot-password" className="text-neutral-500">
            Forgot password
          </Link>
        </div>
      </Card>
    </div>
  );
}
