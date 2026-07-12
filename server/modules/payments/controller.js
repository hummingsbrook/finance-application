const service = require('./service');
const { success, error } = require('../../lib/response');

async function create(req, res) {
  try {
    const { amount, paymentType, harambeeId, paymentMethod, mpesaReceiptNo, phoneNumber } = req.body;

    if (!amount || !paymentType) {
      return error(res, 'amount and paymentType are required.', 400, 'VALIDATION_ERROR');
    }

    if (Number(amount) <= 0) {
      return error(res, 'Amount must be greater than zero.', 400, 'VALIDATION_ERROR');
    }

    const validTypes = ['TITHE', 'OFFERING', 'HARAMBEE'];
    if (!validTypes.includes(paymentType)) {
      return error(res, 'paymentType must be TITHE, OFFERING, or HARAMBEE.', 400, 'VALIDATION_ERROR');
    }

    if (paymentType === 'HARAMBEE' && !harambeeId) {
      return error(res, 'harambeeId is required for HARAMBEE payments.', 400, 'VALIDATION_ERROR');
    }

    const payment = await service.createPayment({
      userId: req.user.id,
      amount,
      paymentType,
      harambeeId,
      paymentMethod: paymentMethod || 'MPESA',
      mpesaReceiptNo,
      phoneNumber,
    });

    return success(res, { payment }, 201);
  } catch (err) {
    return error(res, 'Failed to create payment.', 500, 'SERVER_ERROR');
  }
}

async function getMy(req, res) {
  try {
    const { page, limit, status, paymentType, startDate, endDate } = req.query;
    const result = await service.getMyPayments(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
      paymentType,
      startDate,
      endDate,
    });
    return success(res, result);
  } catch (err) {
    return error(res, 'Failed to fetch payments.', 500, 'SERVER_ERROR');
  }
}

async function confirm(req, res) {
  try {
    const { id } = req.params;
    const payment = await service.confirmPayment(id, req.user.id);
    return success(res, { payment });
  } catch (err) {
    if (err.code === 'P2025') {
      return error(res, 'Payment not found.', 404, 'NOT_FOUND');
    }
    if (err.message === 'PAYMENT_NOT_PENDING') {
      return error(res, 'Payment is not in a pending state and cannot be confirmed.', 409, 'CONFLICT');
    }
    return error(res, 'Failed to confirm payment.', 500, 'SERVER_ERROR');
  }
}

async function reject(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const payment = await service.rejectPayment(id, req.user.id, reason);
    return success(res, { payment });
  } catch (err) {
    if (err.code === 'P2025') {
      return error(res, 'Payment not found.', 404, 'NOT_FOUND');
    }
    if (err.message === 'PAYMENT_NOT_PENDING') {
      return error(res, 'Payment is not in a pending state and cannot be rejected.', 409, 'CONFLICT');
    }
    return error(res, 'Failed to reject payment.', 500, 'SERVER_ERROR');
  }
}

async function mpesaCallback(req, res) {
  try {
    const result = await service.handleMpesaCallback(req.body);
    // M-Pesa expects a 200 response
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    return res.status(200).json({ ResultCode: 1, ResultDesc: 'Internal error' });
  }
}

module.exports = { create, getMy, confirm, reject, mpesaCallback };