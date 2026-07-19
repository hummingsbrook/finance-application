const service = require('./service');
const { success, error } = require('../../lib/response');
const { sanitizeString, MAX_LENGTHS } = require('../../lib/sanitize');

async function list(req, res) {
  try {
    const { page, limit, contributionType, eventType, paymentMethod, year, month, search, sortBy } = req.query;
    const result = await service.listEventContributions({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      contributionType, eventType, paymentMethod,
      year: req.query.year, month: req.query.month,
      search, sortBy,
    });
    return success(res, result);
  } catch (err) {
    console.error('[events.list] error:', err);
    return error(res, 'Failed to fetch event contributions.', 500, 'SERVER_ERROR');
  }
}

async function getById(req, res) {
  try {
    const contribution = await service.getEventContributionById(req.params.id);
    if (!contribution) {
      return error(res, 'Event contribution not found.', 404, 'NOT_FOUND');
    }
    return success(res, { contribution });
  } catch (err) {
    console.error('[events.getById] error:', err);
    return error(res, 'Failed to fetch event contribution.', 500, 'SERVER_ERROR');
  }
}

async function create(req, res) {
  try {
    let {
      contributorName, contributionType,
      purpose, amount, paymentMethod, mpesaReceiptNo, bankName, accountNo, idNumber,
      inKindCategory, inKindDescription, inKindOtherType,
      eventType, eventName, eventDate,
      programmeTeam, notes,
    } = req.body;

    if (!contributorName || !contributorName.trim()) {
      return error(res, 'Contributor name is required.', 400, 'VALIDATION_ERROR');
    }
    if (!contributionType) {
      return error(res, 'Contribution type is required.', 400, 'VALIDATION_ERROR');
    }
    if (!eventType || !eventDate) {
      return error(res, 'Event type and event date are required.', 400, 'VALIDATION_ERROR');
    }

    try {
      contributorName = sanitizeString(contributorName, MAX_LENGTHS.name);
      if (mpesaReceiptNo) mpesaReceiptNo = sanitizeString(mpesaReceiptNo, MAX_LENGTHS.shortCode);
      if (bankName)       bankName       = sanitizeString(bankName, MAX_LENGTHS.name);
      if (accountNo)      accountNo      = sanitizeString(accountNo, MAX_LENGTHS.shortCode);
      if (idNumber)       idNumber       = sanitizeString(idNumber, MAX_LENGTHS.shortCode);
      if (eventName)      eventName      = sanitizeString(eventName, MAX_LENGTHS.name);
      if (notes)          notes          = sanitizeString(notes, MAX_LENGTHS.note);
      if (inKindOtherType) inKindOtherType = sanitizeString(inKindOtherType, MAX_LENGTHS.name);
    } catch (e) {
      return error(res, e.message, 400, 'VALIDATION_ERROR');
    }

    const contribution = await service.createEventContribution({
      contributorName, contributionType,
      purpose: purpose || null,
      amount: amount || null,
      paymentMethod: paymentMethod || null,
      mpesaReceiptNo: mpesaReceiptNo || null,
      bankName: bankName || null,
      accountNo: accountNo || null,
      idNumber: idNumber || null,
      inKindCategory: inKindCategory || null,
      inKindDescription: inKindDescription || null,
      inKindOtherType: inKindOtherType || null,
      eventType, eventName, eventDate,
      programmeTeam: Array.isArray(programmeTeam) ? programmeTeam : [],
      notes: notes || null,
      recordedBy: req.user.id,
    });

    return success(res, { contribution }, 201);
  } catch (err) {
    if (err.status === 400) return error(res, err.message, 400, 'VALIDATION_ERROR');
    console.error('[events.create] error:', err);
    return error(res, 'Failed to create event contribution.', 500, 'SERVER_ERROR');
  }
}

async function update(req, res) {
  try {
    const existing = await service.getEventContributionById(req.params.id);
    if (!existing) return error(res, 'Event contribution not found.', 404, 'NOT_FOUND');
    const contribution = await service.updateEventContribution(req.params.id, req.body);
    return success(res, { contribution });
  } catch (err) {
    if (err.status === 400) return error(res, err.message, 400, 'VALIDATION_ERROR');
    console.error('[events.update] error:', err);
    return error(res, 'Failed to update event contribution.', 500, 'SERVER_ERROR');
  }
}

async function remove(req, res) {
  try {
    const existing = await service.getEventContributionById(req.params.id);
    if (!existing) return error(res, 'Event contribution not found.', 404, 'NOT_FOUND');
    await service.deleteEventContribution(req.params.id);
    return success(res, { message: 'Event contribution deleted successfully.' });
  } catch (err) {
    console.error('[events.remove] error:', err);
    return error(res, 'Failed to delete event contribution.', 500, 'SERVER_ERROR');
  }
}

async function getSummary(req, res) {
  try {
    const now = new Date();
    const year  = parseInt(req.query.year)  || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const summary = await service.getEventSummary({ year, month });
    return success(res, { summary });
  } catch (err) {
    console.error('[events.getSummary] error:', err);
    return error(res, 'Failed to fetch event summary.', 500, 'SERVER_ERROR');
  }
}

async function getYearlySummary(req, res) {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const summary = await service.getEventYearlySummary({ year });
    return success(res, { summary });
  } catch (err) {
    console.error('[events.getYearlySummary] error:', err);
    return error(res, 'Failed to fetch yearly event summary.', 500, 'SERVER_ERROR');
  }
}

module.exports = { list, getById, create, update, remove, getSummary, getYearlySummary };
