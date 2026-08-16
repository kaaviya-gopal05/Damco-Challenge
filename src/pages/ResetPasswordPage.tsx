import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input } from '@/components/ui';
import { notify } from '@/lib/toast';

export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(password);
    setIsSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    notify.success('Password updated. Please log in again.');
    navigate('/login', { replace: true });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Set a new password</h1>
      <p className="mt-1 text-sm text-ink-500">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          type="password"
          label="New password"
          placeholder="At least 6 characters"
          leftIcon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Input
          type="password"
          label="Confirm new password"
          placeholder="••••••••"
          leftIcon={<Lock className="h-4 w-4" />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="mt-2 w-full justify-center" isLoading={isSubmitting}>
          Update password
        </Button>
      </form>
    </div>
  );
}
