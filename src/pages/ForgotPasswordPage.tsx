import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input } from '@/components/ui';

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error } = await resetPassword(email);
    setIsSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    setIsSent(true);
  }

  if (isSent) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-accent-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-ink-900">Check your email</h1>
        <p className="mt-1 text-sm text-ink-500">
          We sent a password reset link to <span className="font-medium text-ink-700">{email}</span>.
        </p>
        <Link to="/login" className="mt-6 text-sm font-medium text-brand-600 hover:text-brand-700">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-500">
        Enter your email and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          type="email"
          label="Email"
          placeholder="you@example.com"
          leftIcon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="mt-2 w-full justify-center" isLoading={isSubmitting}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Remembered your password?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </div>
  );
}
