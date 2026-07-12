import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function SignUp() {
  const { signUp } = useAuth();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setApiError('');
  }

  function validate() {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required.';
    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required.';
    if (!form.password) {
      newErrors.password = 'Password is required.';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      // FIXED: M-6 — same uppercase + lowercase + digit rule used in CreateAccount.jsx
      newErrors.password = 'Password must include uppercase, lowercase, and a number.';
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await signUp({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Account creation failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl card-shadow overflow-hidden">
      {/* Segmented control */}
      <div className="flex border-b border-outline-variant">
        <Link
          to="/signin"
          className="flex-1 text-center py-3 text-label-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          Sign In
        </Link>
        <Link
          to="/signup"
          className="flex-1 text-center py-3 text-label-md font-semibold text-secondary border-b-2 border-secondary bg-surface-container-lowest"
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
              person_add
            </span>
          </div>
          <h2 className="text-headline-md text-on-surface">Create Account</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Join ChurchFinance Pro
          </p>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="bg-error-container/60 border border-error/20 rounded-lg px-4 py-3">
            <p className="text-body-sm text-on-error-container">{apiError}</p>
          </div>
        )}

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            placeholder="John"
            value={form.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            error={errors.firstName}
            autoComplete="given-name"
          />
          <Input
            label="Last Name"
            placeholder="Doe"
            value={form.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            error={errors.lastName}
            autoComplete="family-name"
          />
        </div>

        {/* Email */}
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          error={errors.email}
          autoComplete="email"
        />

        {/* Phone */}
        <Input
          label="Phone Number"
          type="tel"
          placeholder="+254 712 345 678"
          value={form.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          error={errors.phone}
          autoComplete="tel"
        />

        {/* Password */}
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />

        {/* Confirm Password */}
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          value={form.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        {/* Submit */}
        <Button type="submit" fullWidth loading={loading}>
          Create Account
        </Button>

        {/* Footer link */}
        <p className="text-center text-label-sm text-on-surface-variant pt-2">
          Already have an account?{' '}
          <Link to="/signin" className="text-secondary font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}