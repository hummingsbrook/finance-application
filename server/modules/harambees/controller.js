const service = require('./service');
const { success, error } = require('../../lib/response');
const { sanitizeString, MAX_LENGTHS } = require('../../lib/sanitize');

async function list(req, res) {
  try {
    const { page, limit, status } = req.query;
    const result = await service.listHarambees({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
    });
    return success(res, result);
  } catch (err) {
    console.error('[harambees.list] error:', err);
    return error(res, 'Failed to fetch harambees.', 500, 'SERVER_ERROR');
  }
}

async function create(req, res) {
  try {
    let { title, description, targetAmount, startDate, endDate } = req.body;

    if (!title || !targetAmount || !startDate) {
      return error(res, 'title, targetAmount, and startDate are required.', 400, 'VALIDATION_ERROR');
    }

    if (Number(targetAmount) <= 0) {
      return error(res, 'targetAmount must be greater than zero.', 400, 'VALIDATION_ERROR');
    }

    if (endDate && new Date(endDate) <= new Date(startDate)) {
      return error(res, 'endDate must be after startDate.', 400, 'VALIDATION_ERROR');
    }

    try {
      title = sanitizeString(title, MAX_LENGTHS.name);
      if (description) description = sanitizeString(description, MAX_LENGTHS.longText);
    } catch (e) {
      return error(res, e.message, 400, 'VALIDATION_ERROR');
    }

    const harambee = await service.createHarambee({
      title,
      description,
      targetAmount,
      startDate,
      endDate: endDate || null,
      createdBy: req.user.id,
    });

    return success(res, { harambee }, 201);
  } catch (err) {
    console.error('[harambees.create] error:', err);
    return error(res, 'Failed to create harambee.', 500, 'SERVER_ERROR');
  }
}

async function getContributions(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await service.getHarambeeContributions(req.params.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    if (!result) {
      return error(res, 'Harambee not found.', 404, 'NOT_FOUND');
    }

    return success(res, result);
  } catch (err) {
    console.error('[harambees.getContributions] error:', err);
    return error(res, 'Failed to fetch harambee contributions.', 500, 'SERVER_ERROR');
  }
}

async function addContribution(req, res) {
  try {
    let { contributorName, amount, date, paymentMethod, mpesaReceiptNo, notes } = req.body;

    if (!contributorName || !amount || !date) {
      return error(res, 'contributorName, amount, and date are required.', 400, 'VALIDATION_ERROR');
    }

    if (Number(amount) <= 0) {
      return error(res, 'Amount must be greater than zero.', 400, 'VALIDATION_ERROR');
    }

    try {
      contributorName = sanitizeString(contributorName, MAX_LENGTHS.name);
      if (mpesaReceiptNo) mpesaReceiptNo = sanitizeString(mpesaReceiptNo, MAX_LENGTHS.shortCode);
      if (notes) notes = sanitizeString(notes, MAX_LENGTHS.note);
    } catch (e) {
      return error(res, e.message, 400, 'VALIDATION_ERROR');
    }

    const contribution = await service.addHarambeeContribution(req.params.id, {
      contributorName,
      amount,
      date,
      paymentMethod,
      mpesaReceiptNo,
      notes,
      recordedBy: req.user.id,
    });

    return success(res, { contribution }, 201);
  } catch (err) {
    console.error('[harambees.addContribution] error:', err);
    if (err.code === 'P2025') {
      return error(res, 'Harambee not found.', 404, 'NOT_FOUND');
    }
    return error(res, 'Failed to add contribution.', 500, 'SERVER_ERROR');
  }
}

async function update(req, res) {
  try {
    const existing = await service.getHarambeeById(req.params.id);
    if (!existing) {
      return error(res, 'Harambee not found.', 404, 'NOT_FOUND');
    }

    if (req.body.targetAmount !== undefined && Number(req.body.targetAmount) <= 0) {
      return error(res, 'targetAmount must be greater than zero.', 400, 'VALIDATION_ERROR');
    }

    const harambee = await service.updateHarambee(req.params.id, req.body);
    return success(res, { harambee });
  } catch (err) {
    console.error('[harambees.update] error:', err);
    return error(res, 'Failed to update harambee.', 500, 'SERVER_ERROR');
  }
}

async function remove(req, res) {
  try {
    await service.deleteHarambee(req.params.id);
    return success(res, { message: 'Harambee deleted successfully.' });
  } catch (err) {
    console.error('[harambees.remove] error:', err);
    if (err.message === 'HARAMBEE_NOT_FOUND') return error(res, 'Harambee not found.', 404, 'NOT_FOUND');
    if (err.message === 'HARAMBEE_COMPLETED') return error(res, 'Cannot delete a completed harambee.', 409, 'CONFLICT');
    if (err.message === 'HARAMBEE_HAS_CONTRIBUTIONS') return error(res, 'Cannot delete a harambee with existing contributions.', 409, 'CONFLICT');
    return error(res, 'Failed to delete harambee.', 500, 'SERVER_ERROR');
  }
}

module.exports = { list, create, getContributions, addContribution, update, remove };