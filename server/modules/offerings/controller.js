const service = require('./service');
const { success, error } = require('../../lib/response');
const { sanitizeString, MAX_LENGTHS } = require('../../lib/sanitize');

async function list(req, res) {
  try {
    const { page, limit, startDate, endDate, serviceType, status, paymentMethod, year, month, sortBy } = req.query;
    const result = await service.listOfferings({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      startDate,
      endDate,
      serviceType,
      status,
      paymentMethod,
      year,
      month,
      sortBy,
    });
    return success(res, result);
  } catch (err) {
    console.error('[offerings.list] error:', err);
    return error(res, 'Failed to fetch offerings.', 500, 'SERVER_ERROR');
  }
}

async function summary(req, res) {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const result = await service.getOfferingSummary({ year, month });
    return success(res, { summary: result });
  } catch (err) {
    console.error('[offerings.summary] error:', err);
    return error(res, 'Failed to fetch offering summary.', 500, 'SERVER_ERROR');
  }
}

async function yearlySummary(req, res) {
  try {
    const now  = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const summary = await service.getOfferingYearlySummary({ year });
    return success(res, { summary });
  } catch (err) {
    console.error('[offerings.yearlySummary] error:', err);
    return error(res, 'Failed to fetch yearly offering summary.', 500, 'SERVER_ERROR');
  }
}

async function create(req, res) {
  try {
    let { contributorName, amount, date, serviceType, paymentMethod, mpesaReceiptNo, bankName, chequeNumber, idNumber, notes } = req.body;

    if (!contributorName || !amount || !date || !serviceType) {
      return error(res, 'contributorName, amount, date, and serviceType are required.', 400, 'VALIDATION_ERROR');
    }

    if (Number(amount) <= 0) {
      return error(res, 'Amount must be greater than zero.', 400, 'VALIDATION_ERROR');
    }

    // Bank transfer validation
    if ((paymentMethod || '').toUpperCase() === 'BANK_TRANSFER') {
      if (!bankName || !bankName.trim()) {
        return error(res, 'Bank name is required for bank transfer.', 400, 'VALIDATION_ERROR');
      }
      if (!chequeNumber || !chequeNumber.trim()) {
        return error(res, 'Cheque number is required for bank transfer.', 400, 'VALIDATION_ERROR');
      }
    }

    try {
      contributorName = sanitizeString(contributorName, MAX_LENGTHS.name);
      if (mpesaReceiptNo) mpesaReceiptNo = sanitizeString(mpesaReceiptNo, MAX_LENGTHS.shortCode);
      if (bankName) bankName = sanitizeString(bankName, MAX_LENGTHS.name);
      if (chequeNumber) chequeNumber = sanitizeString(chequeNumber, MAX_LENGTHS.shortCode);
      if (idNumber) idNumber = sanitizeString(idNumber, MAX_LENGTHS.shortCode);
      if (notes) notes = sanitizeString(notes, MAX_LENGTHS.note);
    } catch (e) {
      return error(res, e.message, 400, 'VALIDATION_ERROR');
    }

    const offering = await service.createOffering({
      contributorName,
      amount,
      date,
      serviceType,
      paymentMethod: paymentMethod || 'CASH',
      mpesaReceiptNo,
      bankName: bankName || null,
      chequeNumber: chequeNumber || null,
      idNumber: idNumber || null,
      notes,
      recordedBy: req.user.id,
    });

    return success(res, { offering }, 201);
  } catch (err) {
    console.error('[offerings.create] error:', err);
    return error(res, 'Failed to create offering.', 500, 'SERVER_ERROR');
  }
}

async function update(req, res) {
  try {
    const existing = await service.getOfferingById(req.params.id);
    if (!existing) {
      return error(res, 'Offering not found.', 404, 'NOT_FOUND');
    }


    const offering = await service.updateOffering(req.params.id, req.body);
    return success(res, { offering });
  } catch (err) {
    console.error('[offerings.update] error:', err);
    return error(res, 'Failed to update offering.', 500, 'SERVER_ERROR');
  }
}

async function remove(req, res) {
  try {
    const existing = await service.getOfferingById(req.params.id);
    if (!existing) {
      return error(res, 'Offering not found.', 404, 'NOT_FOUND');
    }
    await service.deleteOffering(req.params.id);
    return success(res, { message: 'Offering deleted successfully.' });
  } catch (err) {
    console.error('[offerings.remove] error:', err);
    return error(res, 'Failed to delete offering.', 500, 'SERVER_ERROR');
  }
}

module.exports = { list, summary, yearlySummary, create, update, remove };