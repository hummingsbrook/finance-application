import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import Button from '../../components/ui/Button';

export default function PartnerSettings() {
  const { user, updateUser } = useAuth();

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwApiError, setPwApiError] = useState(null);

  // Profile form
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileErrors, setProfileErrors] = useState({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileApiError, setProfileApiError] = useState(null);

  function validatePassword() {
    const errs = {};
    if (!currentPassword) {
      errs.currentPassword = 'Current password is required.';
    }
    if (!newPassword) {
      errs.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters.';
    }
    if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errs.newPassword = 'New password must be different from current password.';
    }
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateProfile() {
    const errs = {};
    if (!firstName.trim()) {
      errs.firstName = 'First name is required.';
    }
    if (!lastName.trim()) {
      errs.lastName = 'Last name is required.';
    }
    if (phone !== '' && !phone.trim()) {
      errs.phone = 'Phone number cannot be blank spaces.';
    }
    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwApiError(null);
    setPwSuccess(false);

    if (!validatePassword()) return;

    setPwLoading(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword: currentPassword,
        newPassword,
      });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password. Please try again.';
      setPwApiError(msg);
    } finally {
      setPwLoading(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileApiError(null);
    setProfileSuccess(false);

    if (!validateProfile()) return;

    setProfileLoading(true);
    try {
      const res = await api.put('/auth/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
      });
      const updatedUser = res.data?.user || res.data?.data?.user;
      if (updatedUser) {
        updateUser(updatedUser);
      }
      setProfileSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile. Please try again.';
      setProfileApiError(msg);
    } finally {
      setProfileLoading(false);
    }
  }

  const email = user?.email || '';

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-lg">
        {/* Left Column: Forms */}
        <div className="lg:col-span-8 flex flex-col gap-stack-lg">
          {/* Personal Information */}
          <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 card-shadow">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary bg-secondary-container p-2 rounded-lg">person</span>
              <h3 className="text-headline-md text-on-surface">Personal Information</h3>
            </div>

            {/* Success toast */}
            {profileSuccess && (
              <div className="mb-6 p-4 bg-[#E8F5E9] rounded-lg flex items-center gap-3 border border-secondary-container">
                <span className="material-symbols-outlined text-secondary filled" style={{ fontSize: 20 }}>check_circle</span>
                <p className="text-body-sm text-secondary font-bold">Profile updated successfully!</p>
              </div>
            )}

            {/* API Error */}
            {profileApiError && (
              <div className="mb-6 p-4 bg-error-container rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined text-error" style={{ fontSize: 20 }}>error</span>
                <p className="text-body-sm text-on-error-container">{profileApiError}</p>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant">First Name</label>
                <input
                  className="input-field p-3 rounded-lg text-body-lg"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                {profileErrors.firstName && (
                  <p className="text-label-sm text-error">{profileErrors.firstName}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant">Last Name</label>
                <input
                  className="input-field p-3 rounded-lg text-body-lg"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                {profileErrors.lastName && (
                  <p className="text-label-sm text-error">{profileErrors.lastName}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant">Email Address</label>
                <input
                  className="input-field p-3 rounded-lg text-body-lg bg-surface-container cursor-not-allowed opacity-70"
                  type="email"
                  value={email}
                  readOnly
                />
                <p className="text-label-sm text-on-surface-variant">Contact your administrator to change your email.</p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant">Phone Number</label>
                <input
                  className="input-field p-3 rounded-lg text-body-lg"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {profileErrors.phone && (
                  <p className="text-label-sm text-error">{profileErrors.phone}</p>
                )}
              </div>
              <div className="md:col-span-2 pt-4 flex justify-end">
                <Button
                  type="submit"
                  loading={profileLoading}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </section>

          {/* Security / Change Password */}
          <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 card-shadow">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary bg-secondary-container p-2 rounded-lg">security</span>
              <h3 className="text-headline-md text-on-surface">Security</h3>
            </div>

            {/* Success toast */}
            {pwSuccess && (
              <div className="mb-6 p-4 bg-[#E8F5E9] rounded-lg flex items-center gap-3 border border-secondary-container">
                <span className="material-symbols-outlined text-secondary filled" style={{ fontSize: 20 }}>check_circle</span>
                <p className="text-body-sm text-secondary font-bold">Password updated successfully!</p>
              </div>
            )}

            {/* API Error */}
            {pwApiError && (
              <div className="mb-6 p-4 bg-error-container rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined text-error" style={{ fontSize: 20 }}>error</span>
                <p className="text-body-sm text-on-error-container">{pwApiError}</p>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              <div className="md:col-span-2">
                <div className="flex flex-col gap-2">
                  <label className="text-label-md text-on-surface-variant">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field p-3 rounded-lg text-body-lg"
                  />
                </div>
                {pwErrors.currentPassword && (
                  <p className="mt-1 text-label-sm text-error">{pwErrors.currentPassword}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field p-3 rounded-lg text-body-lg"
                />
              </div>
              {pwErrors.newPassword && (
                <p className="mt-1 text-label-sm text-error md:col-span-2">{pwErrors.newPassword}</p>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field p-3 rounded-lg text-body-lg"
                />
              </div>
              {pwErrors.confirmPassword && (
                <p className="mt-1 text-label-sm text-error md:col-span-2">{pwErrors.confirmPassword}</p>
              )}
              <div className="md:col-span-2 flex items-center gap-2 text-on-surface-variant text-body-sm bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>info</span>
                Password must be at least 8 characters. We recommend including a mix of letters, numbers, and symbols.
              </div>
              <div className="md:col-span-2 pt-4 flex justify-end">
                <Button
                  type="submit"
                  loading={pwLoading}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </section>
        </div>

        {/* Right Column: Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-stack-lg">
          {/* Need Help Card */}
          <div className="bg-gradient-to-br from-primary-container to-primary rounded-2xl p-6 relative overflow-hidden text-on-primary card-shadow">
            {/* Decorative background */}
            <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined" style={{ fontSize: 160 }}>support_agent</span>
            </div>
            <div className="relative z-10">
              <h4 className="text-headline-md mb-2">Need help?</h4>
              <p className="text-body-sm opacity-90 mb-6">
                Having trouble with your account or transaction history? Our stewardship team is here to assist you.
              </p>
              <div className="space-y-4">
                <a
                  href="mailto:admin@gracechurch.org"
                  className="flex items-center gap-3 hover:bg-white/10 p-2 rounded-lg transition-colors group"
                >
                  <span className="material-symbols-outlined p-2 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">mail</span>
                  <div>
                    <p className="text-label-sm font-bold">Email Admin</p>
                    <p className="text-label-sm opacity-80">admin@gracechurch.org</p>
                  </div>
                </a>
                <div className="flex items-center gap-3 p-2">
                  <span className="material-symbols-outlined p-2 bg-white/20 rounded-full">schedule</span>
                  <div>
                    <p className="text-label-sm font-bold">Office Hours</p>
                    <p className="text-label-sm opacity-80">Mon-Fri, 9am - 4pm</p>
                  </div>
                </div>
              </div>
              <button className="w-full mt-6 bg-white text-primary text-label-md py-3 rounded-lg hover:bg-surface-container-low transition-all font-bold">
                Open Support Ticket
              </button>
            </div>
          </div>

          {/* System Info Card */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 card-shadow flex flex-col gap-4">
            <h4 className="text-label-md text-on-surface-variant uppercase tracking-wider">System Information</h4>
            <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
              <span className="text-body-sm text-on-surface-variant">Current Version</span>
              <span className="text-label-sm font-bold text-on-surface">v2.4.1-stable</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-body-sm text-on-surface-variant">Role</span>
              <span className="text-label-sm font-bold text-on-surface">Partner</span>
            </div>
            <div className="mt-4 p-3 bg-tertiary-fixed-dim/20 rounded-lg flex items-center gap-3">
              <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <p className="text-label-sm text-tertiary-container leading-tight">
                Your data is secured with AES-256 bank-level encryption.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}