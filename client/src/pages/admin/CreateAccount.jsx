import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getInitials } from '../../lib/utils';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: '',
  password: '',
  confirmPassword: '',
};

const ROLE_OPTIONS = [
  { value: 'PARTNER', label: 'Partner' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

export default function CreateAccount() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const validate = useCallback(() => {
    const errs = {};

    if (!form.firstName.trim()) errs.firstName = 'First name is required.';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required.';

    if (!form.email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!form.role) errs.role = 'Please select a role.';

    if (!form.password) {
      errs.password = 'Password is required.';
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      errs.password = 'Password must include uppercase, lowercase, and a number.';
    }

    if (!form.confirmPassword) {
      errs.confirmPassword = 'Please confirm the password.';
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (form.phone && form.phone.trim()) {
      const cleaned = form.phone.replace(/\s+/g, '');
      if (!/^(\+254|0)[17]\d{8}$/.test(cleaned)) {
        errs.phone = 'Enter a valid Kenyan phone number (e.g. +254712345678 or 0712345678).';
      }
    }

    return errs;
  }, [form]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setServerError('');
    try {
      const { confirmPassword, ...payload } = form;
      const res = await api.post('/users', payload);
      const user = res.data?.user || res.data;
      setSuccessData({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        role: form.role,
      });
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg && typeof msg === 'object') {
        // Handle field-level errors from server
        const serverErrors = {};
        Object.keys(msg).forEach((key) => {
          serverErrors[key] = Array.isArray(msg[key]) ? msg[key][0] : msg[key];
        });
        setErrors(serverErrors);
        setServerError('Please fix the errors below before submitting.');
      } else {
        setServerError(msg || 'Failed to create account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAnother = () => {
    setForm({ ...INITIAL_FORM });
    setErrors({});
    setServerError('');
    setSuccessData(null);
  };

  const roleLabel = ROLE_OPTIONS.find((r) => r.value === successData?.role)?.label || successData?.role || '';

  // Success state
  if (successData) {
    const initials = getInitials(successData.firstName, successData.lastName);
    return (
      <div className="max-w-[1000px] mx-auto space-y-12">
        {/* Header */}
        <div>
          <h2 className="text-headline-lg text-on-surface mb-2">User Management</h2>
          <p className="text-body-lg text-on-surface-variant">Manage accounts and role permissions</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-outline-variant flex space-x-8">
          <button
            onClick={() => navigate('/admin/users')}
            className="pb-3 text-on-surface-variant hover:text-primary text-body-sm font-medium border-b-2 border-transparent transition-colors"
          >
            All Users
          </button>
          <button className="pb-3 text-primary text-body-sm font-bold border-b-2 border-primary">
            Create Account
          </button>
          <button
            onClick={() => navigate('/admin/login-history')}
            className="pb-3 text-on-surface-variant hover:text-primary text-body-sm font-medium border-b-2 border-transparent transition-colors"
          >
            Login History
          </button>
        </div>

        {/* Success Card */}
        <div className="bg-surface-container-lowest border-2 border-secondary rounded-xl p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-container opacity-20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10 space-y-8">
            <div className="flex flex-col items-center text-center space-y-3">
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontSize: 64, fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <div>
                <h3 className="text-headline-md text-on-surface">Account created successfully!</h3>
                <p className="text-body-sm text-on-surface-variant mt-1">The user has been added to the system database.</p>
              </div>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              {/* Summary Box */}
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary-container text-on-primary rounded-full flex items-center justify-center font-bold text-lg">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-semibold text-on-surface truncate">
                    {successData.firstName} {successData.lastName}
                  </p>
                  <p className="text-body-sm text-on-surface-variant text-[13px]">{successData.email}</p>
                </div>
                <div>
                  <span className="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wider">
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* Credentials notice */}
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 flex items-start space-x-3">
                <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 20 }}>lock</span>
                <p className="text-body-sm text-[13px] text-on-surface-variant">
                  The password set during account creation has been saved. Share the login credentials with the user through a secure channel.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 flex flex-col items-center space-y-4">
              <button
                onClick={handleCreateAnother}
                className="border border-secondary text-secondary hover:bg-secondary hover:text-on-secondary transition-colors rounded py-2 px-6 text-label-md font-semibold min-w-[200px] active:scale-95"
              >
                Create Another Account
              </button>
              <button
                onClick={() => navigate('/admin/users')}
                className="text-on-surface-variant hover:text-primary text-label-md font-medium transition-colors"
              >
                Back to All Users
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  const hasErrors = Object.keys(errors).length > 0 || serverError;

  return (
    <div className="max-w-[1000px] mx-auto space-y-12">
      {/* Header */}
      <div>
        <h2 className="text-headline-lg text-on-surface mb-2">User Management</h2>
        <p className="text-body-lg text-on-surface-variant">Manage accounts and role permissions</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant flex space-x-8">
        <button
          onClick={() => navigate('/admin/users')}
          className="pb-3 text-on-surface-variant hover:text-primary text-body-sm font-medium border-b-2 border-transparent transition-colors"
        >
          All Users
        </button>
        <button className="pb-3 text-primary text-body-sm font-bold border-b-2 border-primary">
          Create Account
        </button>
        <button
          onClick={() => navigate('/admin/login-history')}
          className="pb-3 text-on-surface-variant hover:text-primary text-body-sm font-medium border-b-2 border-transparent transition-colors"
        >
          Login History
        </button>
      </div>

      <div className="space-y-6">
        {/* Info Banner */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex items-start space-x-3">
          <span className="material-symbols-outlined text-primary mt-0.5">info</span>
          <div>
            <p className="text-body-sm text-on-surface">
              <strong>Admin-created accounts.</strong> This form creates accounts with any role. Standard users
              can also register via the public portal.
            </p>
          </div>
        </div>

        {/* Server Error Banner */}
        {serverError && (
          <div className="bg-error-container/20 border border-error rounded-xl p-4 flex items-start space-x-3">
            <span className="material-symbols-outlined text-error mt-0.5">cancel</span>
            <p className="text-body-sm text-error font-medium">{serverError}</p>
          </div>
        )}

        {/* Form Card */}
        <div
          className={`bg-surface-container-lowest border rounded-xl p-8 shadow-sm ${
            hasErrors ? 'border-error/50' : 'border-outline-variant'
          }`}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div className="space-y-1.5">
                <label className={`text-label-md block ${errors.firstName ? 'text-error font-semibold' : 'text-on-surface'}`}>
                  First Name <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    className={`w-full h-10 px-3 bg-surface border rounded focus:outline-none focus:ring-2 transition-shadow text-body-sm ${
                      errors.firstName
                        ? 'border-2 border-error focus:border-error focus:ring-error/20 text-error'
                        : 'border-outline-variant focus:border-primary focus:ring-secondary-container'
                    }`}
                    placeholder="e.g. Jane"
                    type="text"
                    value={form.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                  />
                  {errors.firstName && (
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-error">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                    </div>
                  )}
                </div>
                {errors.firstName && (
                  <p className="text-[12px] text-error">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <label className={`text-label-md block ${errors.lastName ? 'text-error font-semibold' : 'text-on-surface'}`}>
                  Last Name <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    className={`w-full h-10 px-3 bg-surface border rounded focus:outline-none focus:ring-2 transition-shadow text-body-sm ${
                      errors.lastName
                        ? 'border-2 border-error focus:border-error focus:ring-error/20 text-error'
                        : 'border-outline-variant focus:border-primary focus:ring-secondary-container'
                    }`}
                    placeholder="e.g. Doe"
                    type="text"
                    value={form.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                  />
                  {errors.lastName && (
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-error">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                    </div>
                  )}
                </div>
                {errors.lastName && (
                  <p className="text-[12px] text-error">{errors.lastName}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className={`text-label-md block ${errors.email ? 'text-error font-semibold' : 'text-on-surface'}`}>
                  Email Address <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    className={`w-full h-10 px-3 bg-surface border rounded focus:outline-none focus:ring-2 transition-shadow text-body-sm ${
                      errors.email
                        ? 'border-2 border-error focus:border-error focus:ring-error/20 text-error'
                        : 'border-outline-variant focus:border-primary focus:ring-secondary-container'
                    }`}
                    placeholder="name@domain.com"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                  {errors.email && (
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-error">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                    </div>
                  )}
                </div>
                {errors.email && <p className="text-[12px] text-error">{errors.email}</p>}
                {!errors.email && (
                  <p className="text-[12px] text-on-surface-variant">
                    No automatic email is sent — share the credentials below with the user securely after creation.
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className={`text-label-md block ${errors.phone ? 'text-error font-semibold' : 'text-on-surface'}`}>
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    className={`w-full h-10 px-3 bg-surface border rounded focus:outline-none focus:ring-2 transition-shadow text-body-sm ${
                      errors.phone
                        ? 'border-2 border-error focus:border-error focus:ring-error/20 text-error'
                        : 'border-outline-variant focus:border-primary focus:ring-secondary-container'
                    }`}
                    placeholder="+254 712 345 678"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                  {errors.phone && (
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-error">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                    </div>
                  )}
                </div>
                {errors.phone && <p className="text-[12px] text-error">{errors.phone}</p>}
                {!errors.phone && (
                  <p className="text-[12px] text-on-surface-variant">Optional. Format: +254 XXX XXX XXX</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-1.5 md:col-span-2">
                <label className={`text-label-md block ${errors.role ? 'text-error font-semibold' : 'text-on-surface'}`}>
                  Role <span className="text-error">*</span>
                </label>
                <div className="relative max-w-xs">
                  <select
                    value={form.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    className={`w-full h-10 pl-3 pr-10 bg-surface border rounded focus:outline-none focus:ring-2 transition-shadow text-body-sm appearance-none ${
                      errors.role
                        ? 'border-2 border-error focus:border-error focus:ring-error/20 text-error'
                        : 'border-outline-variant focus:border-primary focus:ring-secondary-container'
                    }`}
                  >
                    <option disabled value="">
                      Select a role...
                    </option>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-on-surface-variant">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>expand_more</span>
                  </div>
                </div>
                {errors.role && <p className="text-[12px] text-error">{errors.role}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className={`text-label-md block ${errors.password ? 'text-error font-semibold' : 'text-on-surface'}`}>
                  Password <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    className={`w-full h-10 px-3 bg-surface border rounded focus:outline-none focus:ring-2 transition-shadow text-body-sm ${
                      errors.password
                        ? 'border-2 border-error focus:border-error focus:ring-error/20 text-error'
                        : 'border-outline-variant focus:border-primary focus:ring-secondary-container'
                    }`}
                    placeholder="Min 8 characters"
                    type="password"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                  />
                  {errors.password && (
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-error">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                    </div>
                  )}
                </div>
                {errors.password && <p className="text-[12px] text-error">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className={`text-label-md block ${errors.confirmPassword ? 'text-error font-semibold' : 'text-on-surface'}`}>
                  Confirm Password <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    className={`w-full h-10 px-3 bg-surface border rounded focus:outline-none focus:ring-2 transition-shadow text-body-sm ${
                      errors.confirmPassword
                        ? 'border-2 border-error focus:border-error focus:ring-error/20 text-error'
                        : 'border-outline-variant focus:border-primary focus:ring-secondary-container'
                    }`}
                    placeholder="Re-enter password"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  />
                  {errors.confirmPassword && (
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-error">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                    </div>
                  )}
                </div>
                {errors.confirmPassword && <p className="text-[12px] text-error">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary-container text-on-primary hover:bg-on-secondary-fixed-variant transition-colors rounded py-2.5 px-6 text-label-md font-semibold flex items-center justify-center min-w-[200px] disabled:opacity-50 active:scale-95"
              >
                {submitting ? (
                  <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 18 }}>
                    sync
                  </span>
                ) : (
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: 20 }}>
                    person_add
                  </span>
                )}
                {submitting ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}