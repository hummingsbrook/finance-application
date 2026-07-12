const prisma = require('../../lib/prisma');
const { roundMoney } = require('../../lib/money');
const { parsePagination } = require('../../lib/pagination');

async function listOfferings(filters = {}) {
  const { page, limit, skip } = parsePagination(filters);
  const { startDate, endDate, serviceType, status, paymentMethod, year, month, sortBy } = filters;

  const where = {};
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lt = new Date(endDate);
  }
  if (serviceType) {
    where.serviceType = serviceType;
  }

  // Year/month filter (used when table filter sends year/month instead of startDate/endDate)
  if (year && !startDate && !endDate) {
    const y = parseInt(year);
    const monthStart = month ? new Date(y, parseInt(month) - 1, 1) : new Date(y, 0, 1);
    const monthEnd   = month ? new Date(y, parseInt(month), 1)     : new Date(y + 1, 0, 1);
    where.date = { gte: monthStart, lt: monthEnd };
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }
  where.status = status || 'CONFIRMED';

  const [offerings, total] = await Promise.all([
    prisma.offering.findMany({
      where,
      skip,
      take: limit,
      orderBy:
        sortBy === 'amount_desc'   ? { amount: 'desc' }
        : sortBy === 'amount_asc'  ? { amount: 'asc' }
        : sortBy === 'name_asc'    ? { contributorName: 'asc' }
        : sortBy === 'date_asc'    ? { date: 'asc' }
        : { date: 'desc' },
      include: { recordedByUser: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.offering.count({ where }),
  ]);

  return { offerings, total, page, limit };
}

async function getOfferingById(id) {
  return prisma.offering.findUnique({
    where: { id },
    include: { recordedByUser: { select: { id: true, firstName: true, lastName: true } } },
  });
}

async function getOfferingSummary({ year, month }) {
  const confirmedWhere = { status: 'CONFIRMED' };

  // This month boundaries
  const thisMonthStart = new Date(year, month - 1, 1);
  const thisMonthEnd = new Date(year, month, 1);

  // Last month boundaries
  const lastMonthDate = new Date(year, month - 2, 1);
  const lastMonthStart = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1);
  const lastMonthEnd = new Date(year, month - 1, 1);

  // Fetch all confirmed offerings for this month and last month for aggregation
  const [thisMonthOfferings, lastMonthOfferings] = await Promise.all([
    prisma.offering.findMany({
      where: {
        ...confirmedWhere,
        date: { gte: thisMonthStart, lt: thisMonthEnd },
      },
      select: { amount: true, serviceType: true, date: true },
    }),
    prisma.offering.findMany({
      where: {
        ...confirmedWhere,
        date: { gte: lastMonthStart, lt: lastMonthEnd },
      },
      select: { amount: true, serviceType: true, date: true },
    }),
  ]);

  // Compute totals
  const sumAmount = (arr) => arr.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const sumByType = (arr, type) =>
    arr
      .filter((o) => o.serviceType === type)
      .reduce((s, o) => s + (Number(o.amount) || 0), 0);

  const thisMonthTotal = roundMoney(sumAmount(thisMonthOfferings));
  const lastMonthTotal = roundMoney(sumAmount(lastMonthOfferings));
  const mainServiceThis = roundMoney(sumByType(thisMonthOfferings, 'Sunday Main'));
  const mainServiceLast = roundMoney(sumByType(lastMonthOfferings, 'Sunday Main'));
  const sundaySchoolThis = roundMoney(sumByType(thisMonthOfferings, 'Sunday School'));
  const sundaySchoolLast = roundMoney(sumByType(lastMonthOfferings, 'Sunday School'));

  // Weekly breakdown for this month
  const weeklyBreakdown = [
    { week: 'Week 1', mainService: 0, sundaySchool: 0 },
    { week: 'Week 2', mainService: 0, sundaySchool: 0 },
    { week: 'Week 3', mainService: 0, sundaySchool: 0 },
    { week: 'Week 4', mainService: 0, sundaySchool: 0 },
    { week: 'Week 5', mainService: 0, sundaySchool: 0 },
  ];

  for (const o of thisMonthOfferings) {
    const day = new Date(o.date).getDate();
    let weekIdx;
    if (day <= 7) weekIdx = 0;
    else if (day <= 14) weekIdx = 1;
    else if (day <= 21) weekIdx = 2;
    else if (day <= 28) weekIdx = 3;
    else weekIdx = 4;

    const amt = Number(o.amount) || 0;
    if (o.serviceType === 'Sunday Main') {
      weeklyBreakdown[weekIdx].mainService += amt;
    } else if (o.serviceType === 'Sunday School') {
      weeklyBreakdown[weekIdx].sundaySchool += amt;
    }
  }

  // Round weekly values
  for (const w of weeklyBreakdown) {
    w.mainService = roundMoney(w.mainService);
    w.sundaySchool = roundMoney(w.sundaySchool);
  }

  // Build 6-month trend for chart
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const trendMonths = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    trendMonths.push({
      label: `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`,
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
    });
  }
  const trendGroups = await prisma.offering.findMany({
    where: {
      status: 'CONFIRMED',
      date: { gte: trendMonths[0].start, lt: trendMonths[trendMonths.length - 1].end },
    },
    select: { amount: true, serviceType: true, date: true },
  });
  const monthlyTrend = trendMonths.map((m) => {
    const rows = trendGroups.filter((o) => {
      const d = new Date(o.date);
      return d >= m.start && d < m.end;
    });
    return {
      label: m.label,
      mainService: roundMoney(rows.filter((o) => o.serviceType === 'Sunday Main').reduce((s, o) => s + (Number(o.amount) || 0), 0)),
      sundaySchool: roundMoney(rows.filter((o) => o.serviceType === 'Sunday School').reduce((s, o) => s + (Number(o.amount) || 0), 0)),
    };
  });

  // Build 4-year trend
  const currentYear = new Date().getFullYear();
  const yearlyTrendData = [];
  for (let i = 3; i >= 0; i--) {
    const y = currentYear - i;
    yearlyTrendData.push({
      label: String(y),
      start: new Date(y, 0, 1),
      end: new Date(y + 1, 0, 1),
    });
  }
  const yearlyGroups = await prisma.offering.findMany({
    where: {
      status: 'CONFIRMED',
      date: { gte: yearlyTrendData[0].start, lt: yearlyTrendData[yearlyTrendData.length - 1].end },
    },
    select: { amount: true, serviceType: true, date: true },
  });
  const yearlyTrend = yearlyTrendData.map((yt) => {
    const rows = yearlyGroups.filter((o) => {
      const d = new Date(o.date);
      return d >= yt.start && d < yt.end;
    });
    return {
      label: yt.label,
      mainService: roundMoney(rows.filter((o) => o.serviceType === 'Sunday Main').reduce((s, o) => s + (Number(o.amount) || 0), 0)),
      sundaySchool: roundMoney(rows.filter((o) => o.serviceType === 'Sunday School').reduce((s, o) => s + (Number(o.amount) || 0), 0)),
    };
  });

  return {
    thisMonthTotal,
    lastMonthTotal,
    mainServiceThis,
    mainServiceLast,
    sundaySchoolThis,
    sundaySchoolLast,
    weeklyBreakdown,
    monthlyTrend,
    yearlyTrend,
  };
}

async function getOfferingYearlySummary({ year }) {
  const targetYear = year || new Date().getFullYear();

  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd   = new Date(targetYear, 11, 31, 23, 59, 59);

  const prevYear  = targetYear - 1;
  const prevStart = new Date(prevYear, 0, 1);
  const prevEnd   = new Date(prevYear, 11, 31, 23, 59, 59);

  const [thisYearAgg, thisYearCount, prevYearAgg] = await Promise.all([
    prisma.offering.aggregate({
      where: { status: 'CONFIRMED', date: { gte: yearStart, lte: yearEnd } },
      _sum: { amount: true },
    }),
    prisma.offering.count({
      where: { status: 'CONFIRMED', date: { gte: yearStart, lte: yearEnd } },
    }),
    prisma.offering.aggregate({
      where: { status: 'CONFIRMED', date: { gte: prevStart, lte: prevEnd } },
      _sum: { amount: true },
    }),
  ]);

  const totalThisYear = roundMoney(Number(thisYearAgg._sum.amount || 0));
  const countThisYear = thisYearCount;
  const avgThisYear   = countThisYear > 0 ? roundMoney(totalThisYear / countThisYear) : 0;
  const totalLastYear = roundMoney(Number(prevYearAgg._sum.amount || 0));

  // Last 5 years trend (by service type)
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

  const trendRows = await prisma.offering.findMany({
    where: {
      status: 'CONFIRMED',
      date: { gte: yearWindows[0].start, lte: yearWindows[yearWindows.length - 1].end },
    },
    select: { amount: true, serviceType: true, date: true },
  });

  const yearlyTrend = yearWindows.map((w) => {
    const rows = trendRows.filter((o) => {
      const d = new Date(o.date);
      return d >= w.start && d <= w.end;
    });
    return {
      label:        w.label,
      year:         w.year,
      mainService:  roundMoney(rows.filter((o) => o.serviceType === 'Sunday Main').reduce((s, o) => s + (Number(o.amount) || 0), 0)),
      sundaySchool: roundMoney(rows.filter((o) => o.serviceType === 'Sunday School').reduce((s, o) => s + (Number(o.amount) || 0), 0)),
    };
  });

  return { totalThisYear, countThisYear, avgThisYear, totalLastYear, yearlyTrend };
}

async function createOffering(data) {
  const amount = roundMoney(data.amount);

  return prisma.offering.create({
    data: {
      contributorName: data.contributorName,
      amount,
      date: new Date(data.date),
      serviceType: data.serviceType,
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

async function updateOffering(id, data) {
  const updateData = {};
  if (data.contributorName !== undefined) updateData.contributorName = data.contributorName;
  if (data.amount !== undefined) updateData.amount = roundMoney(data.amount);
  if (data.date !== undefined) updateData.date = new Date(data.date);
  if (data.serviceType !== undefined) updateData.serviceType = data.serviceType;
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.mpesaReceiptNo !== undefined) updateData.mpesaReceiptNo = data.mpesaReceiptNo;
  if (data.bankName !== undefined) updateData.bankName = data.bankName;
  if (data.chequeNumber !== undefined) updateData.chequeNumber = data.chequeNumber;
  if (data.idNumber !== undefined) updateData.idNumber = data.idNumber;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined) updateData.status = data.status;

  return prisma.offering.update({
    where: { id },
    data: updateData,
    include: { recordedByUser: { select: { id: true, firstName: true, lastName: true } } },
  });
}

async function deleteOffering(id) {
  return prisma.offering.delete({ where: { id } });
}

module.exports = {
  listOfferings,
  getOfferingById,
  getOfferingSummary,
  getOfferingYearlySummary,
  createOffering,
  updateOffering,
  deleteOffering,
};