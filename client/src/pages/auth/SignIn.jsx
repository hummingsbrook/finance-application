import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function SignIn() {
  const { signIn } = useAuth();
  const location = useLocation();
  const successMessage = location.state?.message || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password, keepSignedIn);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Sign in failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl card-shadow overflow-hidden">
      {/* Success message banner */}
      {successMessage && (
        <div className="bg-[#E8F5E9] border-b border-secondary/20 px-6 py-3">
          <p className="text-body-sm text-secondary font-medium">{successMessage}</p>
        </div>
      )}

      {/* Segmented control */}
      <div className="flex border-b border-outline-variant">
        <Link
          to="/signin"
          className="flex-1 text-center py-3 text-label-md font-semibold text-secondary border-b-2 border-secondary bg-surface-container-lowest"
        >
          Sign In
        </Link>
        <Link
          to="/signup"
          className="flex-1 text-center py-3 text-label-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          Create Account
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-stack-md">
        {/* Header */}
        <div className="text-center mb-2">
          <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-on-primary filled" style={{ fontSize: 28 }}>
              church
            </span>
          </div>
          <h2 className="text-headline-md text-on-surface">Welcome Back</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Sign in to ChurchFinance Pro
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-container/60 border border-error/20 rounded-lg px-4 py-3">
            <p className="text-body-sm text-on-error-container">{error}</p>
          </div>
        )}

        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        {/* Password */}
        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            icon={showPassword ? 'visibility_off' : 'visibility'}
            onIconClick={() => setShowPassword(!showPassword)}
          />
          {/* Toggle visibility — we attach an onclick to the icon area */}
        </div>

        {/* Keep me signed in + forgot password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
              className="w-4 h-4 rounded border-outline-variant text-secondary focus:ring-secondary"
            />
            <span className="text-body-sm text-on-surface-variant">Keep me signed in</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-label-sm text-secondary hover:text-primary transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <Button type="submit" fullWidth loading={loading}>
          Sign In
        </Button>

        {/* Footer */}
        <p className="text-center text-label-sm text-on-surface-variant pt-2">
          &copy; {new Date().getFullYear()} ChurchFinance Pro. All rights reserved.
        </p>
      </form>
    </div>
  );
}