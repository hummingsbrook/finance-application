const service = require('./service');
const { success, error } = require('../../lib/response');
const { sanitizeString, MAX_LENGTHS } = require('../../lib/sanitize');

async function list(req, res) {
  try {
    const { page, limit, startDate, endDate, category, status, search, year, month, sortBy } = req.query;
    const result = await service.listExpenses({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      startDate,
      endDate,
      category,
      status,
      search,
      year,
      month,
      sortBy,
    });
    return success(res, result);
  } catch (err) {
    console.error('[expenses.list] error:', err);
    return error(res, 'Failed to fetch expenses.', 500, 'SERVER_ERROR');
  }
}

async function summary(req, res) {
  try {
    const { year, month, mode, category } = req.query;
    const result = await service.getExpenseSummary({ year, month, mode, category });
    return success(res, result);
  } catch (err) {
    console.error('[expenses.summary] error:', err);
    return error(res, 'Failed to fetch expense summary.', 500, 'SERVER_ERROR');
  }
}

async function yearlySummary(req, res) {
  try {
    const now  = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const summary = await service.getExpenseYearlySummary({ year });
    return success(res, { summary });
  } catch (err) {
    console.error('[expenses.yearlySummary] error:', err);
    return error(res, 'Failed to fetch yearly expense summary.', 500, 'SERVER_ERROR');
  }
}

async function create(req, res) {
  try {
    let { description, amount, date, category, salaryType, paymentMethod, recipientName, mpesaReceiptNo, bankName, accountNo, idNumber, notes } = req.body;

    if (!description || !amount || !date || !category) {
      return error(res, 'description, amount, date, and category are required.', 400, 'VALIDATION_ERROR');
    }

    if (category === 'SALARIES' && !salaryType) {
      return error(res, 'Salary type is required for Salaries expenses.', 400, 'VALIDATION_ERROR');
    }

    if (Number(amount) <= 0) {
      return error(res, 'Amount must be greater than zero.', 400, 'VALIDATION_ERROR');
    }

    // Bank transfer validation
    if ((paymentMethod || '').toUpperCase() === 'BANK_TRANSFER') {
      if (!bankName || !bankName.trim()) {
        return error(res, 'Bank name is required for bank transfer.', 400, 'VALIDATION_ERROR');
      }
      if (!accountNo || !accountNo.trim()) {
        return error(res, 'Account number is required for bank transfer.', 400, 'VALIDATION_ERROR');
      }
    }

    try {
      description = sanitizeString(description, MAX_LENGTHS.name);
      if (recipientName) recipientName = sanitizeString(recipientName, MAX_LENGTHS.name);
      if (mpesaReceiptNo) mpesaReceiptNo = sanitizeString(mpesaReceiptNo, MAX_LENGTHS.shortCode);
      if (bankName) bankName = sanitizeString(bankName, MAX_LENGTHS.name);
      if (accountNo) accountNo = sanitizeString(accountNo, MAX_LENGTHS.shortCode);
      if (idNumber) idNumber = sanitizeString(idNumber, MAX_LENGTHS.shortCode);
      if (notes) notes = sanitizeString(notes, MAX_LENGTHS.note);
    } catch (e) {
      return error(res, e.message, 400, 'VALIDATION_ERROR');
    }

    const expense = await service.createExpense({
      description,
      amount,
      date,
      category,
      salaryType: salaryType || null,
      paymentMethod: paymentMethod || 'CASH',
      recipientName,
      mpesaReceiptNo,
      bankName: bankName || null,
      accountNo: accountNo || null,
      idNumber: idNumber || null,
      notes,
      recordedBy: req.user.id,
    });

    return success(res, { expense }, 201);
  } catch (err) {
    console.error('[expenses.create] error:', err);
    return error(res, 'Failed to create expense.', 500, 'SERVER_ERROR');
  }
}

async function oversight(req, res) {
  try {
    const result = await service.getExpenseOversight(req.query);
    return success(res, result);
  } catch (err) {
    console.error('[expenses.oversight] error:', err);
    return error(res, 'Failed to fetch expense oversight data.', 500, 'SERVER_ERROR');
  }
}

async function approve(req, res) {
  try {
    const updated = await service.approveExpense(req.params.id, req.user.id);
    return success(res, { expense: updated });
  } catch (err) {
    console.error('[expenses.approve] error:', err);
    if (err.message === 'EXPENSE_NOT_PENDING') {
      return error(res, 'Expense is not in a pending state.', 409, 'CONFLICT');
    }
    if (err.code === 'P2025') {
      return error(res, 'Expense not found.', 404, 'NOT_FOUND');
    }
    return error(res, 'Failed to approve expense.', 500, 'SERVER_ERROR');
  }
}

async function reject(req, res) {
  try {
    const { reason } = req.body || {};
    const updated = await service.rejectExpense(req.params.id, req.user.id, reason || null);
    return success(res, { expense: updated });
  } catch (err) {
    console.error('[expenses.reject] error:', err);
    if (err.message === 'EXPENSE_NOT_PENDING') {
      return error(res, 'Expense is not in a pending state.', 409, 'CONFLICT');
    }
    if (err.code === 'P2025') {
      return error(res, 'Expense not found.', 404, 'NOT_FOUND');
    }
    return error(res, 'Failed to reject expense.', 500, 'SERVER_ERROR');
  }
}

async function update(req, res) {
  try {
    const existing = await service.getExpenseById(req.params.id);
    if (!existing) {
      return error(res, 'Expense not found.', 404, 'NOT_FOUND');
    }

    // Allow editing most fields; for security, ignore any attempt to flip
    // approval-related fields directly (those go through /approve and /reject).
    const {
      description, amount, date, category, salaryType,
      paymentMethod, recipientName, mpesaReceiptNo,
      bankName, accountNo, idNumber, notes, status,
    } = req.body;

    const payload = {
      description, amount, date, category, salaryType,
      paymentMethod, recipientName, mpesaReceiptNo,
      bankName, accountNo, idNumber, notes, status,
    };

    // Strip out undefined keys so updateExpense doesn't null them out.
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    const expense = await service.updateExpense(req.params.id, payload);
    return success(res, { expense });
  } catch (err) {
    console.error('[expenses.update] error:', err);
    if (err.code === 'DUPLICATE_MPESA') {
      return error(res, 'This M-Pesa receipt number has already been recorded.', 409, 'DUPLICATE_MPESA');
    }
    if (err.code === 'P2025') {
      return error(res, 'Expense not found.', 404, 'NOT_FOUND');
    }
    return error(res, 'Failed to update expense.', 500, 'SERVER_ERROR');
  }
}

async function remove(req, res) {
  try {
    const deleted = await service.deleteExpense(req.params.id);
    return success(res, { expense: deleted });
  } catch (err) {
    console.error('[expenses.delete] error:', err);
    if (err.code === 'P2025') {
      return error(res, 'Expense not found.', 404, 'NOT_FOUND');
    }
    return error(res, 'Failed to delete expense.', 500, 'SERVER_ERROR');
  }
}

async function checkDuplicate(req, res) {
  try {
    const { mpesaReceiptNo, excludeId } = req.query;
    
    if (!mpesaReceiptNo) {
      return error(res, 'Provide mpesaReceiptNo to check.', 400, 'VALIDATION_ERROR');
    }

    const existing = await service.checkExpenseDuplicate({ 
      mpesaReceiptNo,
      excludeId: excludeId || null,
    });

    if (existing) {
      return res.status(200).json({ 
        duplicate: true, 
        message: 'This M-Pesa receipt number already exists.',
        existingId: existing.id,
      });
    }

    return res.status(200).json({ duplicate: false });
  } catch (err) {
    console.error('[expenses.checkDuplicate] error:', err);
    return error(res, 'Duplicate check failed.', 500, 'SERVER_ERROR');
  }
}

module.exports = { list, summary, yearlySummary, create, oversight, approve, reject, update, remove, checkDuplicate };
