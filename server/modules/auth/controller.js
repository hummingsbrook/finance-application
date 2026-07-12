const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const service = require('./service');
const { success, error } = require('../../lib/response');
const { sendEmail } = require('../../lib/mailer');

/**
 * Parse a human-readable duration string (e.g. "30m", "24h", "7d", "60s")
 * into milliseconds. Returns 0 for unrecognised formats.
 */
function parseDuration(str) {
  if (typeof str !== 'string') return 0;
  const match = str.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 0;
  const num = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

// FIXED: H-1 — shared server-side password complexity validator. Returns an
// error message string when invalid, or null when the password is acceptable.
function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'Password must include uppercase, lowercase, and a number.';
  }
  return null;
}

const KEEP_SIGNED_IN_EXPIRY = '30d';
// FIXED: M-5 — fallback used when parseDuration returns 0 so cookies are
// never accidentally session-only due to a misconfigured env var.
const DEFAULT_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;

function generateToken(user, expiresInOverride) {
  const expiresIn = expiresInOverride || process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

function setTokenCookie(res, req, token, expiresInStr) {
  const isProduction = process.env.NODE_ENV === 'production';
  // FIXED: M-5 — guard against parseDuration returning 0
  let maxAge = parseDuration(expiresInStr);
  if (!maxAge) {
    console.warn(`[auth] parseDuration returned 0 for "${expiresInStr}" — falling back to default ${DEFAULT_COOKIE_MAX_AGE}ms.`);
    maxAge = DEFAULT_COOKIE_MAX_AGE;
  }
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction || req.headers['x-forwarded-proto'] === 'https',
    sameSite: isProduction ? 'Strict' : 'Lax',
    maxAge,
  });
}

// FIXED: M-2 — helper to force-expire the auth cookie so the user must
// re-authenticate after a password change/reset.
function clearTokenCookie(res, req) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction || req.headers['x-forwarded-proto'] === 'https',
    sameSite: isProduction ? 'Strict' : 'Lax',
  });
}

async function signin(req, res) {
  try {
    const { email, password, keepSignedIn } = req.body;

    if (!email || !password) {
      return error(res, 'Email and password are required.', 400, 'VALIDATION_ERROR');
    }

    // FIXED: H-3 — normalise email before lookup
    const normalisedEmail = email.trim().toLowerCase();
    const user = await service.findByEmail(normalisedEmail);

    if (!user) {
      return error(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // FIXED: H-2 — block locked accounts before doing the password compare
    if (service.isAccountLocked(user)) {
      return error(res, 'Account temporarily locked. Try again later.', 423, 'ACCOUNT_LOCKED');
    }

    if (!user.isActive) {
      return error(res, 'Account is deactivated. Contact an administrator.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      // FIXED: H-2 — increment failed attempts (locks at threshold)
      await service.incrementFailedAttempts(user.id);
      return error(res, 'Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const sessionHours = parseInt(process.env.SESSION_DURATION_HOURS) || 8;
    const expiry = keepSignedIn ? KEEP_SIGNED_IN_EXPIRY : `${sessionHours}h`;
    const token = generateToken(user, expiry);
    const cookieExpiry = keepSignedIn ? KEEP_SIGNED_IN_EXPIRY : `${sessionHours}h`;
    setTokenCookie(res, req, token, cookieExpiry);

    // FIXED: H-2 — reset failed attempts on successful login
    await service.resetFailedAttempts(user.id);
    await service.updateLastLogin(user.id);
    await service.createAuditEntry(user.id, 'LOGIN', 'auth', `User signed in from ${req.ip}`, req.ip);

    const { passwordHash, ...userWithoutPassword } = user;
    return success(res, { user: userWithoutPassword });
  } catch (err) {
    return error(res, 'An error occurred during sign in.', 500, 'SERVER_ERROR');
  }
}

async function signup(req, res) {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return error(res, 'Email, password, firstName, and lastName are required.', 400, 'VALIDATION_ERROR');
    }

    // FIXED: H-1 — server-side password complexity
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return error(res, passwordError, 400, 'VALIDATION_ERROR');
    }

    // FIXED: H-3 — normalise email before lookup & storage
    const normalisedEmail = email.trim().toLowerCase();
    const existingUser = await service.findByEmail(normalisedEmail);
    if (existingUser) {
      return error(res, 'Email is already registered.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await service.createUser({
      email: normalisedEmail,
      passwordHash,
      firstName,
      lastName,
      phone,
      role: 'PARTNER',
    });

    const token = generateToken(user);
    const cookieExpiry = process.env.JWT_EXPIRES_IN || '24h';
    setTokenCookie(res, req, token, cookieExpiry);

    await service.createAuditEntry(user.id, 'CREATE', 'auth', `New user signed up`, req.ip);

    const { passwordHash: _ph, ...userWithoutPassword } = user;
    return success(res, { user: userWithoutPassword }, 201);
  } catch (err) {
    return error(res, 'An error occurred during sign up.', 500, 'SERVER_ERROR');
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return error(res, 'Email is required.', 400, 'VALIDATION_ERROR');
    }

    // FIXED: H-3 — normalise email before lookup
    const normalisedEmail = email.trim().toLowerCase();
    const user = await service.findByEmail(normalisedEmail);

    // ALWAYS return the same response regardless of whether the email exists
    // This prevents account enumeration
    if (user) {
      // FIXED: C-3 — generate a single-use random token, store only its hash,
      // and embed the raw token in the reset link. No JWT involved.
      const { rawToken } = await service.setPasswordResetToken(user.id);

      // Dev-mode fallback: log the token for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Password reset token for ${normalisedEmail}: ${rawToken}`);
      }

      // Send password reset email
      const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;
      const html = `
        <div style="max-width:480px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
          <div style="background:#1b5e20;padding:24px 32px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;">ChurchFinance Pro</h1>
          </div>
          <div style="background:#ffffff;padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
            <p style="font-size:16px;margin:0 0 16px;">Hello,</p>
            <p style="font-size:16px;margin:0 0 16px;">We received a request to reset the password for your ChurchFinance Pro account associated with <strong>${user.email}</strong>.</p>
            <p style="font-size:16px;margin:0 0 24px;">Click the button below to set a new password. This link will expire in 1 hour.</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${resetLink}" style="display:inline-block;background:#1b5e20;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:600;">Reset Password</a>
            </div>
            <p style="font-size:14px;color:#757575;margin:24px 0 8px;">If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
            <hr style="border:none;border-top:1px solid #eeeeee;margin:24px 0;" />
            <p style="font-size:13px;color:#9e9e9e;margin:0;text-align:center;">ChurchFinance Pro &mdash; Faithful Stewardship, Simplified</p>
          </div>
        </div>
      `;
      const text = `ChurchFinance Pro — Password Reset\n\nHello,\n\nWe received a request to reset the password for your ChurchFinance Pro account associated with ${user.email}.\n\nClick the link below to set a new password. This link will expire in 1 hour.\n\n${resetLink}\n\nIf you did not request a password reset, you can safely ignore this email — your password will remain unchanged.\n\nChurchFinance Pro — Faithful Stewardship, Simplified`;

      try {
        await sendEmail({
          to: user.email,
          subject: 'ChurchFinance Pro — Password Reset',
          html,
          text,
        });
      } catch (mailErr) {
        // Email delivery failure should not break the flow
        console.error('[mailer] Failed to send password reset email:', mailErr.message);
      }
    }

    return success(res, { message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    // Still return the generic message even on error
    return success(res, { message: 'If that email is registered, a reset link has been sent.' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return error(res, 'Token and new password are required.', 400, 'VALIDATION_ERROR');
    }

    // FIXED: H-1 — server-side password complexity
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return error(res, passwordError, 400, 'VALIDATION_ERROR');
    }

    // FIXED: C-3 — look up the user by the hashed reset token AND verify
    // the expiry is still in the future. No JWT involved.
    const user = await service.findByValidResetToken(token);
    if (!user) {
      return error(res, 'Invalid or expired reset token.', 400, 'INVALID_TOKEN');
    }

    // updatePassword also clears passwordResetToken / passwordResetExpiry
    // (single-use) and resets failedLoginAttempts.
    await service.updatePassword(user.id, newPassword);
    await service.createAuditEntry(user.id, 'UPDATE', 'auth', `Password reset via link from ${req.ip}`, req.ip);

    // FIXED: M-2 — force re-authentication after a password reset
    clearTokenCookie(res, req);

    return success(res, { message: 'Password has been reset successfully.' });
  } catch (err) {
    return error(res, 'An error occurred during password reset.', 500, 'SERVER_ERROR');
  }
}

async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
      return error(res, 'Old password and new password are required.', 400, 'VALIDATION_ERROR');
    }

    // FIXED: H-1 — server-side password complexity
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return error(res, passwordError, 400, 'VALIDATION_ERROR');
    }

    const user = await service.findByEmail(req.user.email);

    if (!user) {
      return error(res, 'User not found.', 404, 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return error(res, 'Current password is incorrect.', 400, 'INVALID_PASSWORD');
    }

    await service.updatePassword(userId, newPassword);
    await service.createAuditEntry(userId, 'UPDATE', 'auth', `User changed their password`, req.ip);

    // FIXED: M-2 — force re-authentication after a password change
    clearTokenCookie(res, req);

    return success(res, { message: 'Password changed successfully.' });
  } catch (err) {
    return error(res, 'An error occurred while changing password.', 500, 'SERVER_ERROR');
  }
}

async function getMe(req, res) {
  try {
    const user = await service.findById(req.user.id);

    if (!user) {
      return error(res, 'User not found.', 404, 'USER_NOT_FOUND');
    }

    return success(res, { user });
  } catch (err) {
    return error(res, 'An error occurred while fetching profile.', 500, 'SERVER_ERROR');
  }
}

async function logout(req, res) {
  try {
    // The logout route is intentionally unauthenticated (so you can clear a
    // stale/invalid cookie). However, when a valid cookie IS present we want
    // to record a LOGOUT audit entry — so we verify the token here manually
    // rather than relying on the `authenticate` middleware.
    const token = req.cookies && req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
      } catch (e) {
        // Invalid/expired token — just clear the cookie, no audit entry.
      }
    }

    clearTokenCookie(res, req);
    if (req.user) {
      await service.createAuditEntry(req.user.id, 'LOGOUT', 'auth', 'User signed out', req.ip);
    }
    return success(res, { message: 'Signed out successfully.' });
  } catch (err) {
    return error(res, 'Logout failed.', 500, 'SERVER_ERROR');
  }
}

async function updateProfile(req, res) {
  try {
    const { firstName, lastName, phone } = req.body;

    if (firstName !== undefined && typeof firstName === 'string' && firstName.trim() === '') {
      return error(res, 'First name is required.', 400, 'VALIDATION_ERROR');
    }
    if (lastName !== undefined && typeof lastName === 'string' && lastName.trim() === '') {
      return error(res, 'Last name is required.', 400, 'VALIDATION_ERROR');
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (phone !== undefined) updateData.phone = phone.trim() || null;

    const user = await service.updateProfile(req.user.id, updateData);
    await service.createAuditEntry(req.user.id, 'UPDATE', 'auth', 'User updated their profile', req.ip);

    return success(res, { user });
  } catch (err) {
    return error(res, 'An error occurred while updating profile.', 500, 'SERVER_ERROR');
  }
}

module.exports = {
  signin,
  signup,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  logout,
  updateProfile,
  // Exported for unit testing of the shared validator (H-1).
  validatePasswordStrength,
};
