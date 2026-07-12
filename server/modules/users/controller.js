const bcrypt = require('bcryptjs');
const service = require('./service');
const { success, error } = require('../../lib/response');

async function list(req, res) {
  try {
    const { page, limit, role, search, status } = req.query;
    const result = await service.listUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      role,
      search,
      status,
    });
    return success(res, result);
  } catch (err) {
    return error(res, 'Failed to fetch users.', 500, 'SERVER_ERROR');
  }
}

async function create(req, res) {
  try {
    const { email, password, firstName, lastName, role, phone, isActive } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return error(res, 'email, password, firstName, and lastName are required.', 400, 'VALIDATION_ERROR');
    }

    const validRoles = ['PARTNER', 'MANAGER', 'SUPER_ADMIN'];
    if (role && !validRoles.includes(role)) {
      return error(res, 'Invalid role. Must be PARTNER, MANAGER, or SUPER_ADMIN.', 400, 'VALIDATION_ERROR');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // FIXED: H-3 — normalise email before storage
    const normalisedEmail = email.trim().toLowerCase();
    const user = await service.createUser({
      email: normalisedEmail,
      passwordHash,
      firstName,
      lastName,
      role: role || 'PARTNER',
      phone,
      isActive,
    });

    // FIXED: C-2 — never return the plain-text password in the API response
    return success(res, { user }, 201);
  } catch (err) {
    if (err.code === 'P2002') {
      return error(res, 'Email is already in use.', 409, 'EMAIL_EXISTS');
    }
    return error(res, 'Failed to create user.', 500, 'SERVER_ERROR');
  }
}

async function update(req, res) {
  try {
    if (req.params.id === req.user.id && req.body.isActive === false) {
      return error(res, 'You cannot deactivate your own account.', 400, 'SELF_DEACTIVATION');
    }
    if (req.params.id === req.user.id && req.body.role && req.body.role !== req.user.role) {
      return error(res, 'You cannot change your own role.', 400, 'SELF_ROLE_CHANGE');
    }

    const { firstName, lastName, email, role, phone, isActive, password } = req.body;

    const data = { firstName, lastName, role, phone, isActive };

    // FIXED: H-3 — normalise email before storage if provided
    if (email !== undefined) {
      data.email = email.trim().toLowerCase();
    }

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const validRoles = ['PARTNER', 'MANAGER', 'SUPER_ADMIN'];
    if (role && !validRoles.includes(role)) {
      return error(res, 'Invalid role. Must be PARTNER, MANAGER, or SUPER_ADMIN.', 400, 'VALIDATION_ERROR');
    }

    const user = await service.updateUser(req.params.id, data);
    return success(res, { user });
  } catch (err) {
    if (err.code === 'P2025') {
      return error(res, 'User not found.', 404, 'NOT_FOUND');
    }
    if (err.code === 'P2002') {
      return error(res, 'Email is already in use.', 409, 'EMAIL_EXISTS');
    }
    return error(res, 'Failed to update user.', 500, 'SERVER_ERROR');
  }
}

async function loginHistory(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await service.getUserLoginHistory(req.params.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    if (!result) {
      return error(res, 'User not found.', 404, 'NOT_FOUND');
    }

    return success(res, result);
  } catch (err) {
    return error(res, 'Failed to fetch login history.', 500, 'SERVER_ERROR');
  }
}

async function bulkDeactivate(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return error(res, 'ids array is required.', 400, 'VALIDATION_ERROR');

    // FIXED: C-4 — never let an admin bulk-deactivate their own account
    const safeIds = ids.filter(id => id !== req.user.id);
    if (safeIds.length === 0) {
      return error(res, 'Cannot bulk-deactivate: operation would remove your own account.', 400, 'SELF_DEACTIVATION');
    }
    const prisma = require('../../lib/prisma');
    await prisma.$transaction(safeIds.map(id => prisma.user.update({ where: { id }, data: { isActive: false } })));
    return success(res, { message: `${safeIds.length} users deactivated.` });
  } catch (err) {
    return error(res, 'Failed to deactivate users.', 500, 'SERVER_ERROR');
  }
}

module.exports = { list, create, update, loginHistory, bulkDeactivate };
