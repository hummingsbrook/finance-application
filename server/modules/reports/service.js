const prisma = require('../../lib/prisma');
const eventService = require('../events/service');

function roundAmount(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

async function getFinancialSummary() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const monthWhere = {
    date: {
      gte: startOfMonth,
      lte: endOfMonth,
    },
    status: 'CONFIRMED',
  };

  const [monthTithes, monthOfferings, monthExpenses, totalTithes, totalOfferings, totalExpenses, monthEventsAgg, totalEventsAgg] =
    await Promise.all([
      prisma.tithe.aggregate({
        where: monthWhere,
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.offering.aggregate({
        where: monthWhere,
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.expense.aggregate({
        where: monthWhere,
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.tithe.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.offering.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.expense.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Event money contributions for the current month
      eventService.getEventsTotalForPeriod({ start: startOfMonth, end: endOfMonth }),
      // Event money contributions all-time
      eventService.getEventsTotalForPeriod({ start: new Date(0), end: new Date(8640000000000000) }),
    ]);

  const monthIncome =
    roundAmount(Number(monthTithes._sum.amount || 0) + Number(monthOfferings._sum.amount || 0) + Number(monthEventsAgg.total || 0));
  const monthExpenditure = roundAmount(Number(monthExpenses._sum.amount || 0));
  const totalIncome =
    roundAmount(Number(totalTithes._sum.amount || 0) + Number(totalOfferings._sum.amount || 0) + Number(totalEventsAgg.total || 0));
  const totalExpenditure = roundAmount(Number(totalExpenses._sum.amount || 0));

  return {
    currentMonth: {
      month: today.getMonth() + 1,
      year: today.getFullYear(),
      tithes: roundAmount(monthTithes._sum.amount || 0),
      titheCount: monthTithes._count.id,
      offerings: roundAmount(monthOfferings._sum.amount || 0),
      offeringCount: monthOfferings._count.id,
      events: roundAmount(monthEventsAgg.total || 0),
      expenses: monthExpenditure,
      expenseCount: monthExpenses._count.id,
      totalIncome: monthIncome,
      netBalance: roundAmount(monthIncome - monthExpenditure),
    },
    allTime: {
      tithes: roundAmount(totalTithes._sum.amount || 0),
      titheCount: totalTithes._count.id,
      offerings: roundAmount(totalOfferings._sum.amount || 0),
      offeringCount: totalOfferings._count.id,
      events: roundAmount(totalEventsAgg.total || 0),
      expenses: totalExpenditure,
      expenseCount: totalExpenses._count.id,
      totalIncome,
      netBalance: roundAmount(totalIncome - totalExpenditure),
    },
  };
}

async function getMonthlyReport(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const where = {
    date: {
      gte: startDate,
      lte: endDate,
    },
    status: 'CONFIRMED',
  };

  const [tithes, offerings, expenses, offeringBreakdown, expenseBreakdown] = await Promise.all([
    prisma.tithe.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.offering.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.offering.groupBy({
      by: ['serviceType'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const totalIncome =
    roundAmount(Number(tithes._sum.amount || 0) + Number(offerings._sum.amount || 0));
  const totalExpenditure = roundAmount(Number(expenses._sum.amount || 0));

  return {
    year,
    month,
    tithes: {
      total: roundAmount(tithes._sum.amount || 0),
      count: tithes._count.id,
    },
    offerings: {
      total: roundAmount(offerings._sum.amount || 0),
      count: offerings._count.id,
      byServiceType: offeringBreakdown.map((item) => ({
        serviceType: item.serviceType,
        total: roundAmount(item._sum.amount || 0),
        count: item._count.id,
      })),
    },
    expenses: {
      total: totalExpenditure,
      count: expenses._count.id,
      byCategory: expenseBreakdown.map((item) => ({
        category: item.category,
        total: roundAmount(item._sum.amount || 0),
        count: item._count.id,
      })),
    },
    income: totalIncome,
    expenditure: totalExpenditure,
    netBalance: roundAmount(totalIncome - totalExpenditure),
  };
}

/**
 * Build the array of last 6 calendar months (oldest to newest).
 * Each entry: { month, year, label, start, end }
 */
function buildLastSixMonths(today = new Date()) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    months.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: MONTH_LABELS[d.getMonth()],
      start,
      end,
    });
  }
  return months;
}

/**
 * Aggregate all dashboard data in a single Promise.all for efficiency.
 * Returns { summary, trend, recentActivity }.
 */
async function getDashboardData({ year, month } = {}) {
  const today = new Date();
  const targetYear = year || today.getFullYear();
  const targetMonth = month || (today.getMonth() + 1);

  const months = buildLastSixMonths(new Date(targetYear, targetMonth - 1, 1));

  // Compose every query into one flat array so they all run in parallel.
  // Layout of `results`:
  //   [0]                          = financial summary object
  //   [1]                          = pending tithes count
  //   [2]                          = pending offerings count
  //   [3]                          = pending expenses count
  //   [4 .. 4 + 18 - 1]            = 6 months × 3 aggregates (tithe/offering/expense)
  //   [22]                         = recent tithes (findMany)
  //   [23]                         = recent offerings (findMany)
  //   [24]                         = recent expenses (findMany)
  //   [25]                         = recent harambee contributions (findMany)
  const trendQueries = months.flatMap((m) => {
    const where = {
      date: { gte: m.start, lte: m.end },
      status: 'CONFIRMED',
    };
    return [
      prisma.tithe.aggregate({ where, _sum: { amount: true } }),
      prisma.offering.aggregate({ where, _sum: { amount: true } }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
      eventService.getEventsTotalForPeriod({ start: m.start, end: m.end }),
    ];
  });

  const results = await Promise.all([
    getFinancialSummary(),
    prisma.tithe.count({ where: { status: 'PENDING' } }),
    prisma.offering.count({ where: { status: 'PENDING' } }),
    prisma.expense.count({ where: { status: 'PENDING' } }),
    ...trendQueries,
    prisma.tithe.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      include: { recordedByUser: { select: { firstName: true, lastName: true } } },
    }),
    prisma.offering.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      include: { recordedByUser: { select: { firstName: true, lastName: true } } },
    }),
    prisma.expense.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      include: { recordedByUser: { select: { firstName: true, lastName: true } } },
    }),
    // Harambee contributions — query HarambeeContribution (not Harambee) because
    // the schema puts amount/date/paymentMethod/recordedByUser on the contribution
    // model, not on the campaign. The campaign title is included via the relation.
    prisma.harambeeContribution.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      include: {
        harambee: { select: { title: true } },
        recordedByUser: { select: { firstName: true, lastName: true } },
      },
    }),
    // Event money contributions — only money type appears in the activity feed
    prisma.eventContribution.findMany({
      take: 10,
      orderBy: { eventDate: 'desc' },
      where: { contributionType: 'MONEY' },
      include: {
        recordedByUser: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const summary = results[0];
  const pendingTithes = results[1];
  const pendingOfferings = results[2];
  const pendingExpenses = results[3];

  // Scoped month window for the selected period
  const scopedStart = new Date(targetYear, targetMonth - 1, 1);
  const scopedEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);
  const scopedWhere = { 
    date: { gte: scopedStart, lte: scopedEnd }, 
    status: 'CONFIRMED' 
  };

  const [scopedTithes, scopedOfferings, scopedExpenses, scopedEvents] = await Promise.all([
    prisma.tithe.aggregate({ where: scopedWhere, _sum: { amount: true }, _count: { id: true } }),
    prisma.offering.aggregate({ where: scopedWhere, _sum: { amount: true }, _count: { id: true } }),
    prisma.expense.aggregate({ where: scopedWhere, _sum: { amount: true }, _count: { id: true } }),
    eventService.getEventsTotalForPeriod({ start: scopedStart, end: scopedEnd }),
  ]);

  const scopedTithesAmt    = roundAmount(Number(scopedTithes._sum.amount || 0));
  const scopedOfferingsAmt = roundAmount(Number(scopedOfferings._sum.amount || 0));
  const scopedExpensesAmt  = roundAmount(Number(scopedExpenses._sum.amount || 0));
  const scopedEventsAmt    = roundAmount(Number(scopedEvents.total || 0));
  const scopedIncome       = roundAmount(scopedTithesAmt + scopedOfferingsAmt + scopedEventsAmt);

  // Override the currentMonth on the summary with the scoped values
  summary.currentMonth = {
    ...summary.currentMonth,       // keeps pendingCount fields added later
    tithes: scopedTithesAmt,
    offerings: scopedOfferingsAmt,
    events: scopedEventsAmt,
    expenses: scopedExpensesAmt,
    totalIncome: scopedIncome,
    netBalance: roundAmount(scopedIncome - scopedExpensesAmt),
    month: targetMonth,
    year: targetYear,
  };

  // ── summary key ───────────────────────────────────────────────
  const pendingCount = pendingTithes + pendingOfferings + pendingExpenses;
  summary.currentMonth = {
    ...summary.currentMonth,
    pendingTithes,
    pendingOfferings,
    pendingExpenses,
    pendingCount,
  };

  // ── trend key ─────────────────────────────────────────────────
  const trendStart = 4;
  const trend = months.map((m, idx) => {
    const base        = trendStart + idx * 4;   // stride 4 now (tithe/offering/expense/event)
    const titheSum    = Number(results[base]?._sum.amount || 0);
    const offeringSum = Number(results[base + 1]?._sum.amount || 0);
    const expenseSum  = Number(results[base + 2]?._sum.amount || 0);
    const eventSum    = Number(results[base + 3]?.total || 0);
    const income      = roundAmount(titheSum + offeringSum + eventSum);
    const expenses    = roundAmount(expenseSum);
    return {
      month: m.month,
      year: m.year,
      label: m.label,
      income,
      expenses,
      net: roundAmount(income - expenses),
    };
  });

  // ── recentActivity key ────────────────────────────────────────
  // After adding the event query, the last FIVE slots hold the recent rows.
  const recentTitheRows     = results[results.length - 5];
  const recentOfferingRows  = results[results.length - 4];
  const recentExpenseRows   = results[results.length - 3];
  const recentHarambeeRows  = results[results.length - 2];
  const recentEventRows     = results[results.length - 1];

  const mapActivity = (row, type) => {
    let description = '';
    if (type === 'tithe') description = row.contributorName || '';
    else if (type === 'offering') description = row.serviceType || '';
    else if (type === 'expense') description = row.description || '';
    else if (type === 'harambee') description = row.harambee?.title || row.contributorName || '';
    else if (type === 'event') description = row.eventName || '';

    const recorder = row.recordedByUser;
    const recordedBy = recorder
      ? `${recorder.firstName || ''} ${recorder.lastName || ''}`.trim()
      : '';

    // For events, the date column is `eventDate` not `date`
    const activityDate = type === 'event' ? row.eventDate : row.date;

    return {
      id: row.id,
      type,
      date: activityDate,
      amount: roundAmount(Number(row.amount || 0)),
      paymentMethod: row.paymentMethod,
      description,
      recordedBy,
    };
  };

  const merged = [
    ...(Array.isArray(recentTitheRows) ? recentTitheRows.map((r) => mapActivity(r, 'tithe')) : []),
    ...(Array.isArray(recentOfferingRows) ? recentOfferingRows.map((r) => mapActivity(r, 'offering')) : []),
    ...(Array.isArray(recentExpenseRows) ? recentExpenseRows.map((r) => mapActivity(r, 'expense')) : []),
    ...(Array.isArray(recentHarambeeRows)
      ? recentHarambeeRows.map((r) => mapActivity(r, 'harambee'))
      : []),
    ...(Array.isArray(recentEventRows)
      ? recentEventRows.map((r) => mapActivity(r, 'event'))
      : []),
  ];

  merged.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentActivity = merged.slice(0, 10);

  return { summary, trend, recentActivity };
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW REPORT FUNCTIONS (added for the rebuilt Reports.jsx page)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a month window [start, end] for the given year + month (1-12).
 * end is the last day of the month at 23:59:59.
 */
function monthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return { start, end };
}

/**
 * getSummary(year, month)
 * Returns an aggregate financial summary for a single calendar month.
 * Tithes / Offerings / Expenses are filtered to status: 'CONFIRMED'.
 * HarambeeContribution has NO status field — all rows in the date range are included.
 */
async function getSummary(year, month) {
  const { start, end } = monthRange(year, month);

  const where = {
    date: { gte: start, lte: end },
    status: 'CONFIRMED',
  };

  const harambeeWhere = {
    date: { gte: start, lte: end },
  };

  const [tithes, offerings, harambees, expenses] = await Promise.all([
    prisma.tithe.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
    prisma.offering.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
    prisma.harambeeContribution.aggregate({
      where: harambeeWhere,
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
  ]);

  const tithesSum = roundAmount(Number(tithes._sum.amount || 0));
  const offeringsSum = roundAmount(Number(offerings._sum.amount || 0));
  const harambeesSum = roundAmount(Number(harambees._sum.amount || 0));
  const expensesSum = roundAmount(Number(expenses._sum.amount || 0));

  const totalIncome = roundAmount(tithesSum + offeringsSum + harambeesSum);
  const netBalance = roundAmount(totalIncome - expensesSum);

  return {
    year,
    month,
    tithes: tithesSum,
    titheCount: tithes._count.id,
    offerings: offeringsSum,
    offeringCount: offerings._count.id,
    harambees: harambeesSum,
    harambeeCount: harambees._count.id,
    expenses: expensesSum,
    expenseCount: expenses._count.id,
    totalIncome,
    netBalance,
    transactionCount:
      tithes._count.id + offerings._count.id + harambees._count.id + expenses._count.id,
  };
}

/**
 * getBreakdown(year, month)
 * Returns:
 *   aggregated — Income Statement rows (Tithes, Offerings total, Harambees, and one row per expense category).
 *   activities — Statement of Activities rows (individual contributions / expenses).
 *                Note: the Statement of Activities tab was removed from the UI; this array is kept for backward compatibility.
 */
async function getBreakdown(year, month, includeActivities = false) {
  const { start, end } = monthRange(year, month);

  const where = { date: { gte: start, lte: end }, status: 'CONFIRMED' };
  const harambeeWhere = { date: { gte: start, lte: end } };

  // Always run the 5 aggregate/groupBy queries needed for the Income Statement.
  // Only run the 3 findMany queries when includeActivities is explicitly requested.
  const baseQueries = [
    prisma.tithe.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
    prisma.offering.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
    prisma.harambeeContribution.aggregate({ where: harambeeWhere, _sum: { amount: true }, _count: { id: true } }),
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
    prisma.expense.groupBy({ by: ['category'], where, _sum: { amount: true }, _count: { id: true } }),
  ];

  const activityQueries = includeActivities
    ? [
        prisma.tithe.findMany({
          where,
          select: { contributorName: true, amount: true },
          orderBy: { date: 'desc' },
        }),
        prisma.harambeeContribution.findMany({
          where: harambeeWhere,
          include: { harambee: { select: { title: true } } },
          orderBy: { date: 'desc' },
        }),
        prisma.expense.findMany({
          where,
          select: { description: true, category: true, amount: true },
          orderBy: { date: 'desc' },
        }),
      ]
    : [];

  const results = await Promise.all([...baseQueries, ...activityQueries]);

  const [titheAgg, offeringAgg, harambeeAgg, expenseAgg, expenseByCategory] = results;
  const titheRows    = includeActivities ? results[5] : [];
  const harambeeRows = includeActivities ? results[6] : [];
  const expenseRows  = includeActivities ? results[7] : [];

  const tithesSum = roundAmount(Number(titheAgg._sum.amount || 0));
  const offeringsSum = roundAmount(Number(offeringAgg._sum.amount || 0));
  const harambeesSum = roundAmount(Number(harambeeAgg._sum.amount || 0));
  const expensesSum = roundAmount(Number(expenseAgg._sum.amount || 0));
  const totalIncome = roundAmount(tithesSum + offeringsSum + harambeesSum);
  const totalExpenses = expensesSum;
  const netBalance = roundAmount(totalIncome - totalExpenses);

  // ── aggregated (Income Statement) ───────────────────────────────
  const aggregated = [];

  aggregated.push({ category: 'Tithes', actual: tithesSum, count: titheAgg._count.id });
  aggregated.push({ category: 'Offerings', actual: offeringsSum, count: offeringAgg._count.id });
  aggregated.push({ category: 'Harambees', actual: harambeesSum, count: harambeeAgg._count.id });
  for (const item of expenseByCategory) {
    aggregated.push({
      category: `Expense — ${item.category}`,
      actual: roundAmount(Number(item._sum.amount || 0)),
      count: item._count.id,
    });
  }

  // ── activities (Statement of Activities) ────────────────────────
  const activities = [];

  // Income rows first
  for (const row of titheRows) {
    const amount = roundAmount(Number(row.amount || 0));
    activities.push({
      description: row.contributorName || 'Anonymous',
      category: 'Tithe',
      amount,
      type: 'income',
      pct: totalIncome > 0 ? roundAmount((amount / totalIncome) * 100) : 0,
    });
  }
  // Harambee contributions
  for (const row of harambeeRows) {
    const amount = roundAmount(Number(row.amount || 0));
    activities.push({
      description: row.harambee?.title || 'Harambee Contribution',
      category: 'Harambee',
      amount,
      type: 'income',
      pct: totalIncome > 0 ? roundAmount((amount / totalIncome) * 100) : 0,
    });
  }
  // Expense rows (negated)
  for (const row of expenseRows) {
    const amount = roundAmount(Number(row.amount || 0));
    activities.push({
      description: row.description || 'Expense',
      category: row.category || 'Miscellaneous',
      amount: -amount,
      type: 'expense',
      pct: totalExpenses > 0 ? roundAmount((amount / totalExpenses) * 100) : 0,
    });
  }

  return { aggregated, activities, income: totalIncome, expenses: totalExpenses, netBalance };
}

/**
 * getSummaryYearly(year)
 * Same shape as getSummary(year, month) but the date range spans
 * Jan 1 – Dec 31 of the given year. Used by Reports.jsx in Yearly mode.
 */
async function getSummaryYearly(year) {
  const start = new Date(year, 0, 1);
  const end   = new Date(year, 11, 31, 23, 59, 59);

  const where         = { date: { gte: start, lte: end }, status: 'CONFIRMED' };
  const harambeeWhere = { date: { gte: start, lte: end } };

  const [tithes, offerings, harambees, expenses] = await Promise.all([
    prisma.tithe.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
    prisma.offering.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
    prisma.harambeeContribution.aggregate({ where: harambeeWhere, _sum: { amount: true }, _count: { id: true } }),
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
  ]);

  const tithesSum    = roundAmount(Number(tithes._sum.amount    || 0));
  const offeringsSum = roundAmount(Number(offerings._sum.amount || 0));
  const harambeesSum = roundAmount(Number(harambees._sum.amount || 0));
  const expensesSum  = roundAmount(Number(expenses._sum.amount  || 0));
  const totalIncome  = roundAmount(tithesSum + offeringsSum + harambeesSum);
  const netBalance   = roundAmount(totalIncome - expensesSum);

  return {
    year,
    tithes: tithesSum,         titheCount:    tithes._count.id,
    offerings: offeringsSum,   offeringCount: offerings._count.id,
    harambees: harambeesSum,   harambeeCount: harambees._count.id,
    expenses:  expensesSum,    expenseCount:  expenses._count.id,
    totalIncome,
    netBalance,
    transactionCount: tithes._count.id + offerings._count.id + harambees._count.id + expenses._count.id,
  };
}

/**
 * getBreakdownYearly(year)
 * Same shape as getBreakdown(year, month) but spanning the full calendar year.
 */
async function getBreakdownYearly(year, includeActivities = false) {
  const start = new Date(year, 0, 1);
  const end   = new Date(year, 11, 31, 23, 59, 59);

  const where = { date: { gte: start, lte: end }, status: 'CONFIRMED' };
  const harambeeWhere = { date: { gte: start, lte: end } };

  // Always run the 5 aggregate/groupBy queries needed for the Income Statement.
  // Only run the 3 findMany queries when includeActivities is explicitly requested.
  const baseQueries = [
    prisma.tithe.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
    prisma.offering.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
    prisma.harambeeContribution.aggregate({ where: harambeeWhere, _sum: { amount: true }, _count: { id: true } }),
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
    prisma.expense.groupBy({ by: ['category'], where, _sum: { amount: true }, _count: { id: true } }),
  ];

  const activityQueries = includeActivities
    ? [
        prisma.tithe.findMany({
          where,
          select: { contributorName: true, amount: true },
          orderBy: { date: 'desc' },
        }),
        prisma.harambeeContribution.findMany({
          where: harambeeWhere,
          include: { harambee: { select: { title: true } } },
          orderBy: { date: 'desc' },
        }),
        prisma.expense.findMany({
          where,
          select: { description: true, category: true, amount: true },
          orderBy: { date: 'desc' },
        }),
      ]
    : [];

  const results = await Promise.all([...baseQueries, ...activityQueries]);

  const [titheAgg, offeringAgg, harambeeAgg, expenseAgg, expenseByCategory] = results;
  const titheRows    = includeActivities ? results[5] : [];
  const harambeeRows = includeActivities ? results[6] : [];
  const expenseRows  = includeActivities ? results[7] : [];

  const tithesSum = roundAmount(Number(titheAgg._sum.amount || 0));
  const offeringsSum = roundAmount(Number(offeringAgg._sum.amount || 0));
  const harambeesSum = roundAmount(Number(harambeeAgg._sum.amount || 0));
  const expensesSum = roundAmount(Number(expenseAgg._sum.amount || 0));
  const totalIncome = roundAmount(tithesSum + offeringsSum + harambeesSum);
  const totalExpenses = expensesSum;
  const netBalance = roundAmount(totalIncome - totalExpenses);

  // ── aggregated (Income Statement) ───────────────────────────────
  const aggregated = [];

  aggregated.push({ category: 'Tithes', actual: tithesSum, count: titheAgg._count.id });
  aggregated.push({ category: 'Offerings', actual: offeringsSum, count: offeringAgg._count.id });
  aggregated.push({ category: 'Harambees', actual: harambeesSum, count: harambeeAgg._count.id });
  for (const item of expenseByCategory) {
    aggregated.push({
      category: `Expense — ${item.category}`,
      actual: roundAmount(Number(item._sum.amount || 0)),
      count: item._count.id,
    });
  }

  // ── activities (Statement of Activities) ────────────────────────
  const activities = [];

  // Income rows first
  for (const row of titheRows) {
    const amount = roundAmount(Number(row.amount || 0));
    activities.push({
      description: row.contributorName || 'Anonymous',
      category: 'Tithe',
      amount,
      type: 'income',
      pct: totalIncome > 0 ? roundAmount((amount / totalIncome) * 100) : 0,
    });
  }
  // Harambee contributions
  for (const row of harambeeRows) {
    const amount = roundAmount(Number(row.amount || 0));
    activities.push({
      description: row.harambee?.title || 'Harambee Contribution',
      category: 'Harambee',
      amount,
      type: 'income',
      pct: totalIncome > 0 ? roundAmount((amount / totalIncome) * 100) : 0,
    });
  }
  // Expense rows (negated)
  for (const row of expenseRows) {
    const amount = roundAmount(Number(row.amount || 0));
    activities.push({
      description: row.description || 'Expense',
      category: row.category || 'Miscellaneous',
      amount: -amount,
      type: 'expense',
      pct: totalExpenses > 0 ? roundAmount((amount / totalExpenses) * 100) : 0,
    });
  }

  return { aggregated, activities, income: totalIncome, expenses: totalExpenses, netBalance };
}

/**
 * getTrend(months)
 * Returns the last N calendar months oldest→newest, with income / expenses / harambees / net per month.
 * Income = tithes + offerings + harambees (CONFIRMED for tithes/offerings; all harambee contributions).
 */
async function getTrend(months = 6) {
  const n = Math.max(1, Math.min(24, Number(months) || 6));
  const today = new Date();
  const windows = [];

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    windows.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: MONTH_LABELS[d.getMonth()],
      start,
      end,
    });
  }

  // Run all month queries in parallel
  const queries = windows.flatMap((m) => {
    const where = { date: { gte: m.start, lte: m.end }, status: 'CONFIRMED' };
    const harambeeWhere = { date: { gte: m.start, lte: m.end } };
    return [
      prisma.tithe.aggregate({ where, _sum: { amount: true } }),
      prisma.offering.aggregate({ where, _sum: { amount: true } }),
      prisma.harambeeContribution.aggregate({ where: harambeeWhere, _sum: { amount: true } }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ];
  });

  const results = await Promise.all(queries);

  const trend = windows.map((m, idx) => {
    const base = idx * 4;
    const titheSum = Number(results[base]?._sum.amount || 0);
    const offeringSum = Number(results[base + 1]?._sum.amount || 0);
    const harambeeSum = Number(results[base + 2]?._sum.amount || 0);
    const expenseSum = Number(results[base + 3]?._sum.amount || 0);
    const income = roundAmount(titheSum + offeringSum + harambeeSum);
    const expenses = roundAmount(expenseSum);
    return {
      month: m.month,
      year: m.year,
      label: m.label,
      income,
      expenses,
      harambees: roundAmount(harambeeSum),
      net: roundAmount(income - expenses),
    };
  });

  return trend;
}

/**
 * generateNarrativeGemini(reportData, language)
 * Calls Google Gemini 2.0 Flash REST API (free model) to generate a 2-paragraph
 * executive summary in English or Kiswahili. Returns { narrative: string | null }.
 * NEVER throws — on any error returns { narrative: null }.
 */
async function generateNarrativeGemini(reportData, language) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[reports.generateNarrative] Gemini error: GEMINI_API_KEY is not set');
      return { narrative: null };
    }

    const prompt =
      language === 'kiswahili'
        ? 'Wewe ni mshauri wa fedha wa kanisa. Andika muhtasari wa mtendaji wa ripoti ya fedha ya kanisa kwa Kiswahili sanifu. Ikiwa ni aya 2 tu. Tumia takwimu zilizotolewa. Toa muhtasari wa hali ya fedha na mwelekeo wa baadaye. Usitumie alama za markdown. Takwimu: ' +
          JSON.stringify(reportData)
        : 'You are a church financial advisor. Write a professional 2-paragraph executive summary for a church financial report in English. Use the provided figures. Summarize financial health and future outlook. Do not use markdown. Data: ' +
          JSON.stringify(reportData);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(
        '[reports.generateNarrative] Gemini error: HTTP',
        response.status,
        errorText.slice(0, 200)
      );
      return { narrative: null };
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(' ') ||
      null;

    return { narrative: text ? text.trim() : null };
  } catch (err) {
    console.error('[reports.generateNarrative] Gemini error:', err);
    return { narrative: null };
  }
}

/**
 * getYearlyDashboardData({ year })
 * Returns KPI summary aggregated for the full selected year,
 * plus a 5-year trend array (oldest → newest), and recent activity for the year.
 * Used by the Manager Dashboard when filterMode === 'Yearly'.
 */
async function getYearlyDashboardData({ year } = {}) {
  const targetYear = year || new Date().getFullYear();

  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd   = new Date(targetYear, 11, 31, 23, 59, 59);
  const yearWhere = { date: { gte: yearStart, lte: yearEnd }, status: 'CONFIRMED' };
  const yearHarambeeWhere = { date: { gte: yearStart, lte: yearEnd } };

  const prevYear  = targetYear - 1;
  const prevStart = new Date(prevYear, 0, 1);
  const prevEnd   = new Date(prevYear, 11, 31, 23, 59, 59);
  const prevWhere = { date: { gte: prevStart, lte: prevEnd }, status: 'CONFIRMED' };
  const prevHarambeeWhere = { date: { gte: prevStart, lte: prevEnd } };

  const [
    yearTithes, yearOfferings, yearHarambees, yearExpenses, yearEvents,
    prevTithes, prevOfferings, prevHarambees, prevExpenses, prevEvents,
    pendingTithes, pendingOfferings, pendingExpenses,
  ] = await Promise.all([
    prisma.tithe.aggregate({ where: yearWhere, _sum: { amount: true }, _count: { id: true } }),
    prisma.offering.aggregate({ where: yearWhere, _sum: { amount: true }, _count: { id: true } }),
    prisma.harambeeContribution.aggregate({ where: yearHarambeeWhere, _sum: { amount: true }, _count: { id: true } }),
    prisma.expense.aggregate({ where: yearWhere, _sum: { amount: true }, _count: { id: true } }),
    eventService.getEventsTotalForPeriod({ start: yearStart, end: yearEnd }),
    prisma.tithe.aggregate({ where: prevWhere, _sum: { amount: true } }),
    prisma.offering.aggregate({ where: prevWhere, _sum: { amount: true } }),
    prisma.harambeeContribution.aggregate({ where: prevHarambeeWhere, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: prevWhere, _sum: { amount: true } }),
    eventService.getEventsTotalForPeriod({ start: prevStart, end: prevEnd }),
    prisma.tithe.count({ where: { status: 'PENDING' } }),
    prisma.offering.count({ where: { status: 'PENDING' } }),
    prisma.expense.count({ where: { status: 'PENDING' } }),
  ]);

  const tithesAmt    = roundAmount(Number(yearTithes._sum.amount || 0));
  const offeringsAmt = roundAmount(Number(yearOfferings._sum.amount || 0));
  const harambeesAmt = roundAmount(Number(yearHarambees._sum.amount || 0));
  const eventsAmt    = roundAmount(Number(yearEvents.total || 0));
  const expensesAmt  = roundAmount(Number(yearExpenses._sum.amount || 0));
  const totalIncome  = roundAmount(tithesAmt + offeringsAmt + harambeesAmt + eventsAmt);
  const netBalance   = roundAmount(totalIncome - expensesAmt);

  const prevTithesAmt    = roundAmount(Number(prevTithes._sum.amount || 0));
  const prevOfferingsAmt = roundAmount(Number(prevOfferings._sum.amount || 0));
  const prevHarambeesAmt = roundAmount(Number(prevHarambees._sum.amount || 0));
  const prevEventsAmt    = roundAmount(Number(prevEvents.total || 0));
  const prevExpensesAmt  = roundAmount(Number(prevExpenses._sum.amount || 0));
  const prevIncome       = roundAmount(prevTithesAmt + prevOfferingsAmt + prevHarambeesAmt + prevEventsAmt);
  const prevNet          = roundAmount(prevIncome - prevExpensesAmt);
  const pendingCount     = pendingTithes + pendingOfferings + pendingExpenses;

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

  const trendQueries = yearWindows.flatMap((w) => {
    const wh  = { date: { gte: w.start, lte: w.end }, status: 'CONFIRMED' };
    const whH = { date: { gte: w.start, lte: w.end } };
    return [
      prisma.tithe.aggregate({ where: wh, _sum: { amount: true } }),
      prisma.offering.aggregate({ where: wh, _sum: { amount: true } }),
      prisma.harambeeContribution.aggregate({ where: whH, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: wh, _sum: { amount: true } }),
      eventService.getEventsTotalForPeriod({ start: w.start, end: w.end }),
    ];
  });
  const trendResults = await Promise.all(trendQueries);

  const trend = yearWindows.map((w, idx) => {
    const base     = idx * 5;   // stride 5 now (tithe/offering/harambee/expense/event)
    const income   = roundAmount(
      Number(trendResults[base]?._sum.amount || 0) +      // tithes
      Number(trendResults[base + 1]?._sum.amount || 0) +  // offerings
      Number(trendResults[base + 2]?._sum.amount || 0) +  // harambees
      Number(trendResults[base + 4]?.total || 0)           // events
    );
    const expenses = roundAmount(Number(trendResults[base + 3]?._sum.amount || 0));
    return { year: w.year, label: w.label, income, expenses, net: roundAmount(income - expenses) };
  });

  // Recent activity scoped to the selected year
  const [rTithes, rOfferings, rExpenses, rHarambees, rEvents] = await Promise.all([
    prisma.tithe.findMany({ where: { date: { gte: yearStart, lte: yearEnd } }, take: 15, orderBy: { date: 'desc' }, include: { recordedByUser: { select: { firstName: true, lastName: true } } } }),
    prisma.offering.findMany({ where: { date: { gte: yearStart, lte: yearEnd } }, take: 15, orderBy: { date: 'desc' }, include: { recordedByUser: { select: { firstName: true, lastName: true } } } }),
    prisma.expense.findMany({ where: { date: { gte: yearStart, lte: yearEnd } }, take: 15, orderBy: { date: 'desc' }, include: { recordedByUser: { select: { firstName: true, lastName: true } } } }),
    prisma.harambeeContribution.findMany({ where: { date: { gte: yearStart, lte: yearEnd } }, take: 15, orderBy: { date: 'desc' }, include: { harambee: { select: { title: true } }, recordedByUser: { select: { firstName: true, lastName: true } } } }),
    prisma.eventContribution.findMany({ where: { eventDate: { gte: yearStart, lte: yearEnd }, contributionType: 'MONEY' }, take: 15, orderBy: { eventDate: 'desc' }, include: { recordedByUser: { select: { firstName: true, lastName: true } } } }),
  ]);

  const mapAct = (row, type) => {
    const desc =
      type === 'tithe' ? row.contributorName || '' :
      type === 'offering' ? row.serviceType || '' :
      type === 'expense' ? row.description || '' :
      type === 'event' ? row.eventName || '' :
      row.harambee?.title || row.contributorName || '';
    const rec = row.recordedByUser;
    const actDate = type === 'event' ? row.eventDate : row.date;
    return {
      id: row.id, type, date: actDate,
      amount: roundAmount(Number(row.amount || 0)),
      paymentMethod: row.paymentMethod,
      description: desc,
      recordedBy: rec ? `${rec.firstName || ''} ${rec.lastName || ''}`.trim() : '',
    };
  };

  const merged = [
    ...rTithes.map((r) => mapAct(r, 'tithe')),
    ...rOfferings.map((r) => mapAct(r, 'offering')),
    ...rExpenses.map((r) => mapAct(r, 'expense')),
    ...rHarambees.map((r) => mapAct(r, 'harambee')),
    ...rEvents.map((r) => mapAct(r, 'event')),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);

  return {
    mode: 'yearly',
    year: targetYear,
    summary: {
      currentYear: {
        year: targetYear,
        tithes: tithesAmt, offerings: offeringsAmt, harambees: harambeesAmt,
        events: eventsAmt,
        totalIncome, expenses: expensesAmt, netBalance,
        pendingCount, pendingTithes, pendingOfferings, pendingExpenses,
      },
      previousYear: {
        year: prevYear, totalIncome: prevIncome,
        expenses: prevExpensesAmt, netBalance: prevNet,
      },
    },
    trend,
    recentActivity: merged,
  };
}

module.exports = {
  getFinancialSummary,
  getMonthlyReport,
  getDashboardData,
  getSummary,
  getBreakdown,
  getSummaryYearly,
  getBreakdownYearly,
  getTrend,
  generateNarrativeGemini,
  getYearlyDashboardData,
};
