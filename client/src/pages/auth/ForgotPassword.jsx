import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      // The backend always returns 200 with a generic message, but handle edge cases
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl card-shadow overflow-hidden">
      <div className="flex border-b border-outline-variant">
        <Link to="/signin" className="flex-1 text-center py-3 text-label-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
          Sign In
        </Link>
        <div className="flex-1 text-center py-3 text-label-md font-semibold text-secondary border-b-2 border-secondary bg-surface-container-lowest">
          Forgot Password
        </div>
      </div>

      <div className="p-6 space-y-stack-md">
        <div className="text-center mb-2">
          <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-on-primary" style={{ fontSize: 28 }}>lock</span>
          </div>
          <h2 className="text-headline-md text-on-surface">Reset Password</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {sent ? 'Check your email for a reset link.' : 'Enter your email to receive a password reset link.'}
          </p>
        </div>

        {sent ? (
          <div className="bg-[#E8F5E9] border border-secondary/20 rounded-lg px-4 py-3 text-center">
            <p className="text-body-sm text-secondary font-medium">If that email is registered, a reset link has been sent.</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-error-container/60 border border-error/20 rounded-lg px-4 py-3">
                <p className="text-body-sm text-on-error-container">{error}</p>
              </div>
            )}
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="button" fullWidth loading={loading} onClick={handleSubmit}>
              Send Reset Link
            </Button>
          </>
        )}

        <p className="text-center">
          <Link to="/signin" className="text-label-sm text-secondary hover:text-primary transition-colors">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}