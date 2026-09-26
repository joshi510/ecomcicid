import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { Button, Card, Input } from '@/components/ui';
import { apiSend, getApiError } from '@/lib/api';
import { isApiOffline, registerLocalUser } from '@/lib/offline';
import type { User } from '@/lib/types';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';

export default function Register() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await apiSend<{ user: User; accessToken: string }>('/auth/register', {
        name,
        email,
        password,
      });
      setSession(data.user, data.accessToken);
      toast({ variant: 'success', title: 'Account created' });
      navigate('/account', { replace: true });
    } catch (error) {
      if (isApiOffline(error)) {
        try {
          const localData = registerLocalUser({ name, email, password });
          setSession(localData.user, localData.accessToken);
          toast({ variant: 'success', title: 'Account created' });
          navigate('/account', { replace: true });
          return;
        } catch (localError) {
          toast({
            variant: 'error',
            title: 'Registration failed',
            message: localError instanceof Error ? localError.message : 'Registration failed',
          });
          return;
        }
      }
      toast({
        variant: 'error',
        title: 'Registration failed',
        message: getApiError(error, 'Use a unique email and a strong password.'),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Seo title="Create account" description="Create a Northline account to checkout and track orders." path="/register" />
      <Card>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
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
            hint="8+ chars with upper, lower, number, and symbol"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-neutral-500">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
