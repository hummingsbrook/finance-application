const prisma = require('../../lib/prisma');
const { roundMoney } = require('../../lib/money');
const { parsePagination } = require('../../lib/pagination');

async function listTithes(filters = {}) {
  const { page, limit, skip } = parsePagination(filters);
  const { startDate, endDate, contributorName, status, paymentMethod, year, month, sortBy } = filters;

  const where = {};
  if (year && month) {
    where.date = {
      gte: new Date(Number(year), Number(month) - 1, 1),
      lte: new Date(Number(year), Number(month), 0, 23, 59, 59),
    };
  } else if (year) {
    where.date = {
      gte: new Date(Number(year), 0, 1),
      lte: new Date(Number(year), 11, 31, 23, 59, 59),
    };
  } else if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lt = new Date(endDate);
  }
  if (contributorName) {
    where.contributorName = { contains: contributorName };
  }
  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }
  where.status = status || 'CONFIRMED';

  const [tithes, total] = await Promise.all([
    prisma.tithe.findMany({
      where,
      skip,
      take: limit,
      orderBy: sortBy === 'amount_desc' ? { amount: 'desc' }
              : sortBy === 'amount_asc'  ? { amount: 'asc' }
              : sortBy === 'name_asc'    ? { contributorName: 'asc' }
              : sortBy === 'date_asc'    ? { date: 'asc' }
              : { date: 'desc' },
      include: { recordedByUser: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.tithe.count({ where }),
  ]);

  return { tithes, total, page, limit };
}

async function getTitheById(id) {
  return prisma.tithe.findUnique({
    where: { id },
    include: { recordedByUser: { select: { id: true, firstName: true, lastName: true } } },
  });
}

async function createTithe(data) {
  const amount = roundMoney(data.amount);

  return prisma.tithe.create({
    data: {
      contributorName: data.contributorName,
      amount,
      date: new Date(data.date),
      paymentMethod: data.paymentMethod || 'CASH',
      mpesaReceiptNo: data.mpesaReceiptNo || null,
      bankName: data.bankName || null,
      chequeNumber: data.chequeNumber || null,
      idNumber: data.idNumber || null,
      notes: data.notes || null,
      status: data.status || 'CONFIRMED',
      recordedBy: data.recordedBy,
    },
    include: { recordedByUser: { select: { id: true, firstName: true, lastName: true } } },
  });
}

async function updateTithe(id, data) {
  const updateData = {};
  if (data.contributorName !== undefined) updateData.contributorName = data.contributorName;
  if (data.amount !== undefined) updateData.amount = roundMoney(data.amount);
  if (data.date !== undefined) updateData.date = new Date(data.date);
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.mpesaReceiptNo !== undefined) updateData.mpesaReceiptNo = data.mpesaReceiptNo;
  if (data.bankName !== undefined) updateData.bankName = data.bankName;
  if (data.chequeNumber !== undefined) updateData.chequeNumber = data.chequeNumber;
  if (data.idNumber !== undefined) updateData.idNumber = data.idNumber;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined) updateData.status = data.status;

  return prisma.tithe.update({
    where: { id },
    data: updateData,
    include: { recordedByUser: { select: { id: true, firstName: true, lastName: true } } },
  });
}

async function getTitheSummary({ year, month }) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // This month boundaries
  const thisMonthStart = new Date(year, month - 1, 1);
  const thisMonthEnd = new Date(year, month, 1);

  // Last month boundaries
  const lastMonthDate = new Date(year, month - 2, 1);
  const lastMonthStart = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1);
  const lastMonthEnd = new Date(year, month - 1, 1);

  const confirmedWhere = { status: 'CONFIRMED' };

  // Build last 6 months ending with the given year+month
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    months.push({
      label: monthNames[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth(),
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
    });
  }

  const [thisMonthSum, lastMonthSum, thisMonthCount, monthlyGroups] = await Promise.all([
    prisma.tithe.aggregate({
      where: { ...confirmedWhere, date: { gte: thisMonthStart, lt: thisMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.tithe.aggregate({
      where: { ...confirmedWhere, date: { gte: lastMonthStart, lt: lastMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.tithe.count({
      where: { ...confirmedWhere, date: { gte: thisMonthStart, lt: thisMonthEnd } },
    }),
    prisma.tithe.findMany({
      where: {
        ...confirmedWhere,
        date: { gte: months[0].start, lt: months[months.length - 1].end },
      },
      select: { amount: true, date: true },
    }),
  ]);

  const totalThisMonth = Number(thisMonthSum._sum.amount || 0);
  const totalLastMonth = Number(lastMonthSum._sum.amount || 0);
  const countThisMonth = thisMonthCount;
  const avgThisMonth = countThisMonth > 0 ? totalThisMonth / countThisMonth : 0;

  // Bucket the monthly rows into the 6 slots
  const trendMap = {};
  for (const m of months) {
    const key = `${m.year}-${m.month}`;
    trendMap[key] = { month: m.label, total: 0 };
  }
  for (const row of monthlyGroups) {
    const d = new Date(row.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!trendMap[key]) continue;
    trendMap[key].total += Number(row.amount) || 0;
  }
  const monthlyTrend = months.map((m) => trendMap[`${m.year}-${m.month}`]);

  return {
    totalThisMonth,
    totalLastMonth,
    countThisMonth,
    avgThisMonth,
    monthlyTrend,
  };
}

async function deleteTithe(id) {
  return prisma.tithe.delete({
    where: { id },
  });
}

/**
 * getTitheYearlySummary({ year })
 * Aggregates full-year KPIs for the selected year + last 5 years trend.
 * Used by the Tithes page when periodMode === 'Yearly'.
 */
async function getTitheYearlySummary({ year }) {
  const targetYear = year || new Date().getFullYear();

  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd   = new Date(targetYear, 11, 31, 23, 59, 59);

  const prevYear  = targetYear - 1;
  const prevStart = new Date(prevYear, 0, 1);
  const prevEnd   = new Date(prevYear, 11, 31, 23, 59, 59);

  const [thisYearAgg, thisYearCount, prevYearAgg] = await Promise.all([
    prisma.tithe.aggregate({
      where: { status: 'CONFIRMED', date: { gte: yearStart, lte: yearEnd } },
      _sum: { amount: true },
    }),
    prisma.tithe.count({
      where: { status: 'CONFIRMED', date: { gte: yearStart, lte: yearEnd } },
    }),
    prisma.tithe.aggregate({
      where: { status: 'CONFIRMED', date: { gte: prevStart, lte: prevEnd } },
      _sum: { amount: true },
    }),
  ]);

  const totalThisYear  = Number(thisYearAgg._sum.amount || 0);
  const countThisYear  = thisYearCount;
  const avgThisYear    = countThisYear > 0 ? totalThisYear / countThisYear : 0;
  const totalLastYear  = Number(prevYearAgg._sum.amount || 0);

  // Last 5 years trend
  const yearWindows = [];
  for (let i = 4; i >= 0; i--) {
    const y = targetYear - i;
    yearWindows.push({
      year: y,
      label: String(y),
      start: new Date(y, 0, 1),
      end:   new Date(y, 11, 31, 23, 59, 59),
    });
  }

  const trendResults = await Promise.all(
    yearWindows.map((w) =>
      prisma.tithe.aggregate({
        where: { status: 'CONFIRMED', date: { gte: w.start, lte: w.end } },
        _sum: { amount: true },
      })
    )
  );

  const yearlyTrend = yearWindows.map((w, idx) => ({
    label: w.label,
    year:  w.year,
    total: Number(trendResults[idx]._sum.amount || 0),
  }));

  return {
    totalThisYear,
    countThisYear,
    avgThisYear,
    totalLastYear,
    yearlyTrend,
  };
}

module.exports = {
  listTithes,
  getTitheById,
  createTithe,
  updateTithe,
  deleteTithe,
  getTitheSummary,
  getTitheYearlySummary,
};