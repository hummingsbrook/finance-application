const https = require('https');
const prisma = require('../../lib/prisma');
const { roundMoney } = require('../../lib/money');
const { parsePagination } = require('../../lib/pagination');

async function getMpesaAccessToken() {
  const consumerKey    = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('M-Pesa credentials not configured in environment.');
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const isSandbox = process.env.MPESA_ENVIRONMENT !== 'production';
  const host = isSandbox
    ? 'sandbox.safaricom.co.ke'
    : 'api.safaricom.co.ke';

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host,
      path: '/oauth/v1/generate?grant_type=client_credentials',
      method: 'GET',
      headers: { Authorization: `Basic ${auth}` },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.access_token) reject(new Error('No access token in response'));
          else resolve(parsed.access_token);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function initiateStkPush({ phoneNumber, amount, checkoutRequestId, callbackUrl }) {
  const accessToken  = await getMpesaAccessToken();
  const isSandbox    = process.env.MPESA_ENVIRONMENT !== 'production';
  const host         = isSandbox ? 'sandbox.safaricom.co.ke' : 'api.safaricom.co.ke';
  const shortCode    = process.env.MPESA_SHORTCODE || '174379';
  const passkey      = process.env.MPESA_PASSKEY;

  if (!passkey) throw new Error('MPESA_PASSKEY is not set.');

  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password  = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

  // Normalise phone: strip +, ensure starts with 254
  const phone = String(phoneNumber).replace(/^\+/, '').replace(/^0/, '254');

  const body = JSON.stringify({
    BusinessShortCode: shortCode,
    Password:          password,
    Timestamp:         timestamp,
    TransactionType:   'CustomerPayBillOnline',
    Amount:            Math.ceil(amount),          // M-Pesa requires whole shillings
    PartyA:            phone,
    PartyB:            shortCode,
    PhoneNumber:       phone,
    CallBackURL:       callbackUrl,
    AccountReference:  'ChurchFinance',
    TransactionDesc:   'Church Payment',
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host,
      path:     '/mpesa/stkpush/v1/processrequest',
      method:   'POST',
      headers: {
        Authorization:    `Bearer ${accessToken}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function createPayment(data) {
  const amount = roundMoney(data.amount);

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        userId:            data.userId,
        amount,
        paymentType:       data.paymentType,
        harambeeId:        data.harambeeId || null,
        paymentMethod:     data.paymentMethod || 'MPESA',
        mpesaReceiptNo:    data.mpesaReceiptNo || null,
        phoneNumber:       data.phoneNumber || null,
        status:            'PENDING',
        checkoutRequestId: crypto.randomUUID(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Only attempt STK push for M-Pesa payments that have a phone number
    if (data.paymentMethod === 'MPESA' && data.phoneNumber) {
      const callbackUrl = process.env.MPESA_CALLBACK_URL
        || 'https://YOUR-NGROK-URL.ngrok-free.app/api/payments/mpesa/callback';

      try {
        const stkResponse = await initiateStkPush({
          phoneNumber:       data.phoneNumber,
          amount,
          checkoutRequestId: payment.checkoutRequestId,
          callbackUrl,
        });

        // Store the real CheckoutRequestID from Safaricom so the callback can match it
        if (stkResponse.CheckoutRequestID) {
          await tx.payment.update({
            where: { id: payment.id },
            data:  { checkoutRequestId: stkResponse.CheckoutRequestID },
          });
          payment.checkoutRequestId = stkResponse.CheckoutRequestID;
        }
      } catch (stkErr) {
        // Log but don't fail the payment creation — manager can confirm manually
        console.error('[STK Push failed]', stkErr.message);
      }
    }

    return payment;
  });
}

async function getMyPayments(userId, filters = {}) {
  const { page, limit, skip } = parsePagination(filters);
  const { status, paymentType, startDate, endDate } = filters;

  const where = { userId };
  if (status) where.status = status;
  if (paymentType) where.paymentType = paymentType;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lt = new Date(endDate);
  }

  // Summary always uses confirmed + no date/type filter
  // so KPI cards always show all-time totals regardless of filters
  const confirmedWhere = { userId, status: 'CONFIRMED' };

  // Build last 6 month boundaries (oldest to newest)
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: monthNames[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth(),
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
    });
  }

  const [payments, total, titheSum, offeringSum, otherSum, monthlyGroups] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        harambee: { select: { id: true, title: true } },
        confirmedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { ...confirmedWhere, paymentType: 'TITHE' },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { ...confirmedWhere, paymentType: 'OFFERING' },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { ...confirmedWhere, paymentType: 'HARAMBEE' },
      _sum: { amount: true },
    }),
    // groupBy on createdAt (month truncated) isn't reliable across DB engines,
    // so fetch raw rows for the date range and bucket in JS — still only pulls
    // the 6-month window of CONFIRMED payments, not the entire table.
    prisma.payment.findMany({
      where: {
        ...confirmedWhere,
        createdAt: { gte: months[0].start, lt: months[months.length - 1].end },
      },
      select: { paymentType: true, amount: true, createdAt: true },
    }),
  ]);

  // Bucket the monthly rows into the 6 slots
  const trendMap = {};
  for (const m of months) {
    const key = `${m.year}-${m.month}`;
    trendMap[key] = { month: m.label, tithes: 0, offerings: 0, other: 0 };
  }
  for (const row of monthlyGroups) {
    const d = new Date(row.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!trendMap[key]) continue;
    const amt = Number(row.amount) || 0;
    switch ((row.paymentType || '').toUpperCase()) {
      case 'TITHE':
        trendMap[key].tithes += amt;
        break;
      case 'OFFERING':
        trendMap[key].offerings += amt;
        break;
      default:
        trendMap[key].other += amt;
        break;
    }
  }
  const monthlyTrend = months.map((m) => trendMap[`${m.year}-${m.month}`]);

  return {
    payments,
    total,
    page,
    limit,
    summary: {
      totalTithes: Number(titheSum._sum.amount || 0),
      totalOfferings: Number(offeringSum._sum.amount || 0),
      totalOther: Number(otherSum._sum.amount || 0),
      monthlyTrend,
    },
  };
}

async function confirmPayment(id, confirmedBy) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id, status: 'PENDING' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        confirmedByUser: { select: { id: true, firstName: true, lastName: true } },
        harambee: { select: { id: true, title: true } },
      },
    });

    if (!payment) {
      throw new Error('PAYMENT_NOT_PENDING');
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'CONFIRMED', confirmedBy, confirmedAt: new Date() },
    });

    // If this is a harambee payment, update the harambee current amount
    if (payment.harambeeId) {
      await tx.harambee.update({
        where: { id: payment.harambeeId },
        data: {
          currentAmount: {
            increment: Number(payment.amount),
          },
        },
      });

      // Also create a harambee contribution record
      await tx.harambeeContribution.create({
        data: {
          harambeeId: payment.harambeeId,
          contributorName: `${payment.user.firstName} ${payment.user.lastName}`,
          amount: payment.amount,
          date: new Date(),
          paymentMethod: payment.paymentMethod,
          mpesaReceiptNo: payment.mpesaReceiptNo,
          recordedBy: confirmedBy,
        },
      });

      // Check if harambee is now fully funded
      const updatedHarambee = await tx.harambee.findUnique({
        where: { id: payment.harambeeId },
      });

      if (updatedHarambee && Number(updatedHarambee.currentAmount) >= Number(updatedHarambee.targetAmount)) {
        await tx.harambee.update({
          where: { id: payment.harambeeId },
          data: { status: 'COMPLETED' },
        });
      }
    }

    payment.status = 'CONFIRMED';
    payment.confirmedBy = confirmedBy;
    payment.confirmedAt = new Date();
    return payment;
  });
}

async function rejectPayment(id, confirmedBy, reason) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id, status: 'PENDING' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        confirmedByUser: { select: { id: true, firstName: true, lastName: true } },
        harambee: { select: { id: true, title: true } },
      },
    });

    if (!payment) {
      throw new Error('PAYMENT_NOT_PENDING');
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'REJECTED', rejectionReason: reason || null, confirmedBy, confirmedAt: new Date() },
    });

    payment.status = 'REJECTED';
    payment.rejectionReason = reason || null;
    payment.confirmedBy = confirmedBy;
    payment.confirmedAt = new Date();
    return payment;
  });
}

async function handleMpesaCallback(callbackData) {
  const { Body: body } = callbackData;
  const { stkCallback } = body;

  if (!stkCallback) {
    return { success: false, message: 'Invalid callback format.' };
  }

  const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

  if (ResultCode !== 0) {
    // Payment failed
    const failedPayment = await prisma.payment.findFirst({
      where: { checkoutRequestId: CheckoutRequestID, status: 'PENDING' },
    });

    if (failedPayment) {
      await prisma.payment.update({
        where: { id: failedPayment.id },
        data: { status: 'FAILED', rejectionReason: ResultDesc },
      });
    }

    return { success: false, message: 'M-Pesa payment failed.' };
  }

  // Payment succeeded
  const metadataItems = CallbackMetadata ? CallbackMetadata.Item : [];
  const mpesaReceiptNo = metadataItems.find((item) => item.Name === 'MpesaReceiptNumber')?.Value || null;
  const phoneNumber = metadataItems.find((item) => item.Name === 'PhoneNumber')?.Value || null;
  const amount = metadataItems.find((item) => item.Name === 'Amount')?.Value || 0;

  const payment = await prisma.payment.findFirst({
    where: { checkoutRequestId: CheckoutRequestID, status: 'PENDING' },
  });

  if (!payment) {
    return { success: false, message: 'No matching pending payment found.' };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'CONFIRMED',
      mpesaReceiptNo: mpesaReceiptNo || payment.mpesaReceiptNo,
      phoneNumber: phoneNumber ? String(phoneNumber) : payment.phoneNumber,
      confirmedAt: new Date(),
    },
  });

  return { success: true, message: 'Payment confirmed via M-Pesa callback.' };
}

module.exports = {
  createPayment,
  getMyPayments,
  confirmPayment,
  rejectPayment,
  handleMpesaCallback,
};