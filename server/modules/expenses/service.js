const prisma = require('../../lib/prisma');
const { roundMoney } = require('../../lib/money');
const { parsePagination } = require('../../lib/pagination');

const VALID_CATEGORIES = ['SALARIES', 'UTILITIES', 'MAINTENANCE', 'EVENTS', 'TRANSPORT', 'SUPPLIES', 'MISCELLANEOUS'];
const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'REJECTED', 'FAILED'];

async function listExpenses(filters = {}) {
  const { page, limit, skip } = parsePagination(filters);
  const { startDate, endDate, category, status, search, year, month, sortBy } = filters;

  const where = {};
  if (search) {
    where.OR = [
      { description: { contains: search } },
      { recipientName: { contains: search } },
    ];
  }
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lt = new Date(endDate);
  }

  // Year/month filter — used when the table filter sends year/month
  if (year && !startDate && !endDate) {
    const y = parseInt(year);
    const monthStart = month ? new Date(y, parseInt(month) - 1, 1) : new Date(y, 0, 1);
    const monthEnd   = month ? new Date(y, parseInt(month), 1)     : new Date(y + 1, 0, 1);
    where.date = { gte: monthStart, lt: monthEnd };
  }

  if (category && VALID_CATEGORIES.includes(category)) {
    where.category = category;
  }
  where.status = (status && VALID_STATUSES.includes(status)) ? status : 'CONFIRMED';

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy:
        sortBy === 'amount_desc'  ? { amount: 'desc' }
        : sortBy === 'amount_asc' ? { amount: 'asc' }
        : sortBy === 'date_asc'   ? { date: 'asc' }
        : { date: 'desc' },
      include: {
        recordedByUser: { select: { id: true, firstName: true, lastName: true } },
        approvedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return { expenses, total, page, limit };
}

async function getExpenseSummary(filters = {}) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const now = new Date();
  const year = filters.year != null ? parseInt(filters.year) : now.getFullYear();
  const month = filters.month != null ? parseInt(filters.month) : now.getMonth() + 1;
  const mode = filters.mode || 'monthly'; // 'monthly' | 'yearly'

  let kpiStart, kpiEnd;
  if (mode === 'yearly') {
    // Full current year
    kpiStart = new Date(year, 0, 1);
    kpiEnd   = new Date(year + 1, 0, 1);
  } else {
    // Single month
    kpiStart = new Date(year, month - 1, 1);
    kpiEnd   = new Date(year, month, 1);
  }

  const confirmedWhere = { status: 'CONFIRMED', date: { gte: kpiStart, lt: kpiEnd } };

  // ─── Trend windows ───
  let trendWindows = [];
  if (mode === 'yearly') {
    // Last 4 years
    for (let i = 3; i >= 0; i--) {
      const y = year - i;
      trendWindows.push({
        label: String(y),
        start: new Date(y, 0, 1),
        end:   new Date(y + 1, 0, 1),
      });
    }
  } else {
    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      trendWindows.push({
        label: monthNames[d.getMonth()],
        year:  d.getFullYear(),
        month: d.getMonth(),
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end:   new Date(d.getFullYear(), d.getMonth() + 1, 1),
      });
    }
  }

  const trendStart = trendWindows[0].start;
  const trendEnd   = trendWindows[trendWindows.length - 1].end;

  const [totalResult, countResult, byCategoryRaw, trendGroups] = await Promise.all([
    prisma.expense.aggregate({
      where: confirmedWhere,
      _sum: { amount: true },
    }),
    prisma.expense.count({ where: confirmedWhere }),
    prisma.expense.groupBy({
      by: ['category'],
      where: confirmedWhere,
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
    prisma.expense.findMany({
      where: { status: 'CONFIRMED', date: { gte: trendStart, lt: trendEnd } },
      select: { amount: true, date: true, category: true },
    }),
  ]);

  const totalAmount = roundMoney(totalResult._sum.amount);
  const count = countResult;

  const byCategory = byCategoryRaw.map((item) => ({
    category: item.category,
    totalAmount: roundMoney(item._sum.amount),
    count: item._count.id,
    pct: totalAmount > 0 ? Number(((Number(item._sum.amount) / totalAmount) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.totalAmount - a.totalAmount);

  const mostFrequentCategory = byCategoryRaw.length > 0
    ? byCategoryRaw.reduce((a, b) => a._count.id >= b._count.id ? a : b).category
    : null;

  // ─── Trend bucketing ───
  let monthlyTrend;
  if (mode === 'yearly') {
    // Sum by year
    const yearMap = {};
    for (const w of trendWindows) yearMap[w.label] = { month: w.label, total: 0 };
    for (const row of trendGroups) {
      const y = String(new Date(row.date).getFullYear());
      if (yearMap[y]) yearMap[y].total += Number(row.amount) || 0;
    }
    monthlyTrend = trendWindows.map((w) => ({
      month: yearMap[w.label].month,
      total: roundMoney(yearMap[w.label].total),
    }));
  } else {
    // Sum by month (existing logic)
    const trendMap = {};
    for (const m of trendWindows) {
      const key = `${m.year}-${m.month}`;
      trendMap[key] = { month: m.label, total: 0 };
    }
    for (const row of trendGroups) {
      const d = new Date(row.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!trendMap[key]) continue;
      trendMap[key].total += Number(row.amount) || 0;
    }
    monthlyTrend = trendWindows.map((m) => ({
      month: trendMap[`${m.year}-${m.month}`].month,
      total: roundMoney(trendMap[`${m.year}-${m.month}`].total),
    }));
  }

  // ─── Category trend (stacked bar) — by month or year ───
  // For each trend window, give per-category totals so the stacked bar chart can show category breakdown over time.
  const VALID_CATS = ['SALARIES', 'UTILITIES', 'MAINTENANCE', 'EVENTS', 'TRANSPORT', 'SUPPLIES', 'MISCELLANEOUS'];

  const categoryTrend = trendWindows.map((w) => {
    const rows = trendGroups.filter((r) => {
      const d = new Date(r.date);
      return d >= w.start && d < w.end;
    });
    const entry = { label: w.label };
    for (const cat of VALID_CATS) {
      entry[cat] = roundMoney(
        rows.filter((r) => r.category === cat).reduce((s, r) => s + (Number(r.amount) || 0), 0)
      );
    }
    return entry;
  });

  return { totalAmount, count, mostFrequentCategory, byCategory, monthlyTrend, categoryTrend };
}

async function getExpenseOversight(filters = {}) {
  const { page, limit, skip } = parsePagination(filters);
  const { category, status, startDate, endDate } = filters;

  const where = {};
  if (category && category !== 'All' && VALID_CATEGORIES.includes(category)) {
    where.category = category;
  }
  if (status) {
    where.status = status;
  }
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [expenses, total, pendingCountResult, totalExpensesResult, thisMonthResult] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        recordedByUser: { select: { firstName: true, lastName: true } },
        approvedByUser: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({
      where: { status: 'PENDING' },
      _count: { id: true },
    }),
    prisma.expense.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        status: 'CONFIRMED',
        date: { gte: currentMonthStart, lt: currentMonthEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  const summary = {
    totalExpenses: roundMoney(totalExpensesResult._sum.amount),
    pendingCount: pendingCountResult._count.id,
    thisMonthTotal: roundMoney(thisMonthResult._sum.amount),
  };

  return { expenses, total, page, limit, summary };
}

async function getExpenseYearlySummary({ year }) {
  const targetYear = year || new Date().getFullYear();

  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd   = new Date(targetYear, 11, 31, 23, 59, 59);
  const prevYear  = targetYear - 1;
  const prevStart = new Date(prevYear, 0, 1);
  const prevEnd   = new Date(prevYear, 11, 31, 23, 59, 59);

  const [thisYearAgg, thisYearCount, prevYearAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: { status: 'CONFIRMED', date: { gte: yearStart, lte: yearEnd } },
      _sum: { amount: true },
    }),
    prisma.expense.count({
      where: { status: 'CONFIRMED', date: { gte: yearStart, lte: yearEnd } },
    }),
    prisma.expense.aggregate({
      where: { status: 'CONFIRMED', date: { gte: prevStart, lte: prevEnd } },
      _sum: { amount: true },
    }),
  ]);

  const totalThisYear = roundMoney(Number(thisYearAgg._sum.amount || 0));
  const countThisYear = thisYearCount;
  const avgThisYear   = countThisYear > 0 ? roundMoney(totalThisYear / countThisYear) : 0;
  const totalLastYear = roundMoney(Number(prevYearAgg._sum.amount || 0));

  // Last 5 years trend
  const yearWindows = [];
  for (let i = 4; i >= 0; i--) {
    const y = targetYear - i;
    yearWindows.push({
      year: y, label: String(y),
      start: new Date(y, 0, 1),
      end:   new Date(y, 11, 31, 23, 59, 59),
    });
  }

  const trendRows = await prisma.expense.findMany({
    where: {
      status: 'CONFIRMED',
      date: { gte: yearWindows[0].start, lte: yearWindows[yearWindows.length - 1].end },
    },
    select: { amount: true, category: true, date: true },
  });

  const yearlyTrend = yearWindows.map((w) => {
    const rows = trendRows.filter((r) => {
      const d = new Date(r.date);
      return d >= w.start && d <= w.end;
    });
    return {
      label: w.label,
      year:  w.year,
      total: roundMoney(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)),
    };
  });

  // Category breakdown for the selected year
  const categoryBreakdown = [];
  const VALID_CATS = ['SALARIES','UTILITIES','MAINTENANCE','EVENTS','TRANSPORT','SUPPLIES','MISCELLANEOUS'];
  const thisYearRows = trendRows.filter((r) => {
    const d = new Date(r.date);
    return d >= yearStart && d <= yearEnd;
  });
  for (const cat of VALID_CATS) {
    const total = roundMoney(
      thisYearRows.filter((r) => r.category === cat)
        .reduce((s, r) => s + (Number(r.amount) || 0), 0)
    );
    if (total > 0) categoryBreakdown.push({ category: cat, total });
  }

  return { totalThisYear, countThisYear, avgThisYear, totalLastYear, yearlyTrend, categoryBreakdown };
}

async function createExpense(data) {
  const amount = roundMoney(data.amount);

  return prisma.expense.create({
    data: {
      description: data.description,
      amount,
      date: new Date(data.date),
      category: data.category,
      paymentMethod: data.paymentMethod || 'CASH',
      recipientName: data.recipientName || null,
      mpesaReceiptNo: data.mpesaReceiptNo || null,
      bankName: data.bankName || null,
      accountNo: data.accountNo || null,
      idNumber: data.idNumber || null,
      notes: data.notes || null,
      status: data.status || 'CONFIRMED',
      recordedBy: data.recordedBy,
      approvedBy: data.approvedBy || null,
    },
    include: {
      recordedByUser: { select: { id: true, firstName: true, lastName: true } },
      approvedByUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

async function approveExpense(id, approvedBy) {
  const expense = await prisma.expense.findFirst({
    where: { id, status: 'PENDING' },
  });
  if (!expense) throw new Error('EXPENSE_NOT_PENDING');
  return prisma.expense.update({
    where: { id },
    data: { status: 'CONFIRMED', approvedBy },
  });
}

async function rejectExpense(id, approvedBy, reason) {
  const expense = await prisma.expense.findFirst({
    where: { id, status: 'PENDING' },
  });
  if (!expense) throw new Error('EXPENSE_NOT_PENDING');
  return prisma.expense.update({
    where: { id },
    data: { status: 'REJECTED', approvedBy, notes: reason || null },
  });
}

async function updateExpense(id, data) {
  const updateData = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = roundMoney(data.amount);
  if (data.date !== undefined) updateData.date = new Date(data.date);
  if (data.category !== undefined && VALID_CATEGORIES.includes(data.category)) updateData.category = data.category;
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.recipientName !== undefined) updateData.recipientName = data.recipientName;
  if (data.mpesaReceiptNo !== undefined) updateData.mpesaReceiptNo = data.mpesaReceiptNo;
  if (data.bankName !== undefined) updateData.bankName = data.bankName;
  if (data.accountNo !== undefined) updateData.accountNo = data.accountNo;
  if (data.idNumber !== undefined) updateData.idNumber = data.idNumber;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined && VALID_STATUSES.includes(data.status)) updateData.status = data.status;
  if (data.approvedBy !== undefined) updateData.approvedBy = data.approvedBy;

  return prisma.expense.update({
    where: { id },
    data: updateData,
    include: {
      recordedByUser: { select: { id: true, firstName: true, lastName: true } },
      approvedByUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

async function getExpenseById(id) {
  return prisma.expense.findUnique({
    where: { id },
    include: {
      recordedByUser: { select: { id: true, firstName: true, lastName: true } },
      approvedByUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

module.exports = {
  listExpenses,
  getExpenseSummary,
  getExpenseYearlySummary,
  getExpenseOversight,
  createExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  getExpenseById,
};
