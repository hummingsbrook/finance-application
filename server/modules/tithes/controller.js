const service = require('./service');
const { success, error } = require('../../lib/response');
const { sanitizeString, MAX_LENGTHS } = require('../../lib/sanitize');

async function list(req, res) {
  try {
    const { page, limit, startDate, endDate, contributorName, status, paymentMethod } = req.query;
    const result = await service.listTithes({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      startDate,
      endDate,
      contributorName,
      status,
      paymentMethod,
      year: req.query.year,
      month: req.query.month,
      sortBy: req.query.sortBy,
    });
    return success(res, result);
  } catch (err) {
    console.error('[tithes.list] error:', err);
    return error(res, 'Failed to fetch tithes.', 500, 'SERVER_ERROR');
  }
}

async function getById(req, res) {
  try {
    const tithe = await service.getTitheById(req.params.id);
    if (!tithe) {
      return error(res, 'Tithe not found.', 404, 'NOT_FOUND');
    }
    return success(res, { tithe });
  } catch (err) {
    console.error('[tithes.getById] error:', err);
    return error(res, 'Failed to fetch tithe.', 500, 'SERVER_ERROR');
  }
}

async function create(req, res) {
  try {
    let { contributorName, amount, date, paymentMethod, mpesaReceiptNo,
          bankName, chequeNumber, idNumber, notes } = req.body;

    if (!contributorName || !amount || !date) {
      return error(res, 'contributorName, amount, and date are required.', 400, 'VALIDATION_ERROR');
    }

    if (Number(amount) <= 0) {
      return error(res, 'Amount must be greater than zero.', 400, 'VALIDATION_ERROR');
    }

    // Bank transfer requires bank name and cheque number
    if ((paymentMethod || '').toUpperCase() === 'BANK_TRANSFER') {
      if (!bankName || !bankName.trim()) {
        return error(res, 'Bank name is required for bank transfer payments.', 400, 'VALIDATION_ERROR');
      }
      if (!chequeNumber || !chequeNumber.trim()) {
        return error(res, 'Cheque number is required for bank transfer payments.', 400, 'VALIDATION_ERROR');
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

    const tithe = await service.createTithe({
      contributorName,
      amount,
      date,
      paymentMethod: paymentMethod || 'CASH',
      mpesaReceiptNo,
      bankName: bankName || null,
      chequeNumber: chequeNumber || null,
      idNumber: idNumber || null,
      notes,
      recordedBy: req.user.id,
    });

    return success(res, { tithe }, 201);
  } catch (err) {
    console.error('[tithes.create] error:', err);
    if (err.code === 'DUPLICATE_MPESA') {
      return error(res, 'This M-Pesa receipt number has already been recorded.', 409, 'DUPLICATE_MPESA');
    }
    if (err.code === 'DUPLICATE_CHEQUE') {
      return error(res, 'This cheque number has already been recorded.', 409, 'DUPLICATE_CHEQUE');
    }
    return error(res, 'Failed to create tithe.', 500, 'SERVER_ERROR');
  }
}

async function update(req, res) {
  try {
    const existing = await service.getTitheById(req.params.id);
    if (!existing) {
      return error(res, 'Tithe not found.', 404, 'NOT_FOUND');
    }


    const tithe = await service.updateTithe(req.params.id, req.body);
    return success(res, { tithe });
  } catch (err) {
    console.error('[tithes.update] error:', err);
    if (err.code === 'DUPLICATE_MPESA') {
      return error(res, 'This M-Pesa receipt number has already been recorded.', 409, 'DUPLICATE_MPESA');
    }
    if (err.code === 'DUPLICATE_CHEQUE') {
      return error(res, 'This cheque number has already been recorded.', 409, 'DUPLICATE_CHEQUE');
    }
    return error(res, 'Failed to update tithe.', 500, 'SERVER_ERROR');
  }
}

async function getSummary(req, res) {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const summary = await service.getTitheSummary({ year, month });
    return success(res, { summary });
  } catch (err) {
    console.error('[tithes.getSummary] error:', err);
    return error(res, 'Failed to fetch tithe summary.', 500, 'SERVER_ERROR');
  }
}

async function getYearlySummary(req, res) {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const summary = await service.getTitheYearlySummary({ year });
    return success(res, { summary });
  } catch (err) {
    console.error('[tithes.getYearlySummary] error:', err);
    return error(res, 'Failed to fetch yearly tithe summary.', 500, 'SERVER_ERROR');
  }
}

async function remove(req, res) {
  try {
    const existing = await service.getTitheById(req.params.id);
    if (!existing) {
      return error(res, 'Tithe not found.', 404, 'NOT_FOUND');
    }
    await service.deleteTithe(req.params.id);
    return success(res, { message: 'Tithe deleted successfully.' });
  } catch (err) {
    console.error('[tithes.remove] error:', err);
    return error(res, 'Failed to delete tithe.', 500, 'SERVER_ERROR');
  }
}

async function checkDuplicate(req, res) {
  try {
    const { mpesaReceiptNo, chequeNumber, excludeId } = req.query;
    
    if (!mpesaReceiptNo && !chequeNumber) {
      return error(res, 'Provide mpesaReceiptNo or chequeNumber to check.', 400, 'VALIDATION_ERROR');
    }

    const existing = await service.checkTitheDuplicate({ 
      mpesaReceiptNo: mpesaReceiptNo || null,
      chequeNumber: chequeNumber || null,
      excludeId: excludeId || null,
    });

    if (existing) {
      return res.status(200).json({ 
        duplicate: true, 
        message: 'This receipt/cheque number already exists.',
        existingId: existing.id,
      });
    }

    return res.status(200).json({ duplicate: false });
  } catch (err) {
    console.error('[tithes.checkDuplicate] error:', err);
    return error(res, 'Duplicate check failed.', 500, 'SERVER_ERROR');
  }
}

module.exports = { list, getById, create, update, remove, getSummary, getYearlySummary, checkDuplicate };