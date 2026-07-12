import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  function validate() {
    const errs = {};
    if (!password) {
      errs.password = 'New password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Password reset failed. The link may have expired.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl card-shadow p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#E8F5E9] flex items-center justify-center mx-auto mb-3">
          <span className="material-symbols-outlined text-secondary filled" style={{ fontSize: 28 }}>
            check_circle
          </span>
        </div>
        <h2 className="text-headline-md text-on-surface mb-2">Password Reset</h2>
        <p className="text-body-sm text-on-surface-variant mb-6">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <Link
          to="/signin"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-container text-on-primary rounded-xl font-semibold hover:bg-primary-container/90 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            arrow_back
          </span>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl card-shadow overflow-hidden">
      {/* Header area */}
      <div className="px-6 pt-6 pb-2 text-center">
        <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-3">
          <span className="material-symbols-outlined text-on-primary filled" style={{ fontSize: 28 }}>
            lock_reset
          </span>
        </div>
        <h2 className="text-headline-md text-on-surface">Set New Password</h2>
        <p className="text-body-sm text-on-surface-variant mt-1">
          Enter your new password below.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-stack-md">
        {/* Error */}
        {error && (
          <div className="bg-error-container/60 border border-error/20 rounded-lg px-4 py-3">
            <p className="text-body-sm text-on-error-container">{error}</p>
          </div>
        )}

        {/* New Password */}
        <Input
          label="New Password"
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldErrors((prev) => ({ ...prev, password: '' }));
          }}
          error={fieldErrors.password}
          autoComplete="new-password"
        />

        {/* Confirm Password */}
        <Input
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter new password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
          }}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
        />

        {/* Submit */}
        <Button type="submit" fullWidth loading={loading}>
          Reset Password
        </Button>

        {/* Footer link */}
        <p className="text-center text-label-sm text-on-surface-variant pt-2">
          Remember your password?{' '}
          <Link to="/signin" className="text-secondary font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}