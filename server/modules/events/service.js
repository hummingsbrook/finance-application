const prisma = require('../../lib/prisma');
const { roundAmount } = require('../../lib/money');
const { parsePagination } = require('../../lib/pagination');

// Preset event names and their standard dates (month is 1-based)
const PRESET_EVENTS = {
  NEW_YEAR:             { name: 'New Year\'s Day',       month: 1,  day: 1  },
  GOOD_FRIDAY:          { name: 'Good Friday',            month: null, day: null }, // moveable
  EASTER_SUNDAY:        { name: 'Easter Sunday',          month: null, day: null }, // moveable
  EASTER_MONDAY:        { name: 'Easter Monday',          month: null, day: null }, // moveable
  CHRISTMAS:            { name: 'Christmas Day',          month: 12, day: 25 },
  BOXING_DAY:           { name: 'Boxing Day',             month: 12, day: 26 },
  THANKSGIVING_SUNDAY:  { name: 'Thanksgiving Sunday',   month: null, day: null },
  CHURCH_ANNIVERSARY:   { name: 'Church Anniversary',    month: null, day: null },
  HARVEST_FESTIVAL:     { name: 'Harvest Festival',      month: null, day: null },
  CUSTOM:               { name: '',                       month: null, day: null },
};

const VALID_CONTRIBUTION_TYPES = ['MONEY', 'IN_KIND'];
const VALID_IN_KIND_CATEGORIES = ['FOOD', 'CLOTHES', 'SUPPLIES', 'OTHERS'];
const VALID_PAYMENT_METHODS    = ['CASH', 'MPESA', 'BANK_TRANSFER'];
const VALID_EVENT_TYPES        = Object.keys(PRESET_EVENTS);

async function listEventContributions(filters = {}) {
  const { page, limit, skip } = parsePagination(filters);
  const { contributionType, eventType, paymentMethod, year, month, search, sortBy } = filters;

  const where = {};

  if (year && month) {
    where.eventDate = {
      gte: new Date(Number(year), Number(month) - 1, 1),
      lte: new Date(Number(year), Number(month), 0, 23, 59, 59),
    };
  } else if (year) {
    where.eventDate = {
      gte: new Date(Number(year), 0, 1),
      lte: new Date(Number(year), 11, 31, 23, 59, 59),
    };
  }

  if (contributionType && VALID_CONTRIBUTION_TYPES.includes(contributionType)) {
    where.contributionType = contributionType;
  }
  if (eventType && VALID_EVENT_TYPES.includes(eventType)) {
    where.eventType = eventType;
  }
  if (paymentMethod && VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    where.paymentMethod = paymentMethod;
  }
  if (search) {
    where.OR = [
      { contributorName: { contains: search } },
      { eventName: { contains: search } },
      { inKindDescription: { contains: search } },
    ];
  }

  const orderBy =
    sortBy === 'amount_desc' ? { amount: 'desc' }
    : sortBy === 'amount_asc' ? { amount: 'asc' }
    : sortBy === 'name_asc'  ? { contributorName: 'asc' }
    : sortBy === 'date_asc'  ? { eventDate: 'asc' }
    : { eventDate: 'desc' };

  const [contributions, total] = await Promise.all([
    prisma.eventContribution.findMany({
      where, skip, take: limit, orderBy,
      include: {
        recordedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.eventContribution.count({ where }),
  ]);

  return { contributions, total, page, limit };
}

async function getEventContributionById(id) {
  return prisma.eventContribution.findUnique({
    where: { id },
    include: {
      recordedByUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

async function createEventContribution(data) {
  // Validate contribution type
  if (!VALID_CONTRIBUTION_TYPES.includes(data.contributionType)) {
    throw Object.assign(new Error('Invalid contribution type.'), { status: 400 });
  }

  // Money-specific validation
  if (data.contributionType === 'MONEY') {
    if (!data.amount || Number(data.amount) <= 0) {
      throw Object.assign(new Error('Amount must be greater than zero for money contributions.'), { status: 400 });
    }
    if (data.paymentMethod && !VALID_PAYMENT_METHODS.includes(data.paymentMethod)) {
      throw Object.assign(new Error('Invalid payment method.'), { status: 400 });
    }
  }

  // In-Kind specific validation
  if (data.contributionType === 'IN_KIND') {
    if (!data.inKindCategory || !VALID_IN_KIND_CATEGORIES.includes(data.inKindCategory)) {
      throw Object.assign(new Error('In-Kind category is required.'), { status: 400 });
    }
    if (!data.inKindDescription || !data.inKindDescription.trim()) {
      throw Object.assign(new Error('Description is required for in-kind donations.'), { status: 400 });
    }
    if (data.inKindCategory === 'OTHERS' && (!data.inKindOtherType || !data.inKindOtherType.trim())) {
      throw Object.assign(new Error('Please specify the donation type when category is Others.'), { status: 400 });
    }
  }

  // Event type validation
  if (!data.eventType || !VALID_EVENT_TYPES.includes(data.eventType)) {
    throw Object.assign(new Error('Valid event type is required.'), { status: 400 });
  }
  if (!data.eventName || !data.eventName.trim()) {
    throw Object.assign(new Error('Event name is required.'), { status: 400 });
  }
  if (!data.eventDate) {
    throw Object.assign(new Error('Event date is required.'), { status: 400 });
  }

  // Validate and serialise programmeTeam
  let programmeTeamJson = null;
  if (data.programmeTeam && Array.isArray(data.programmeTeam) && data.programmeTeam.length > 0) {
    const cleaned = data.programmeTeam
      .filter((m) => m.name && m.name.trim())
      .map((m) => ({ name: m.name.trim(), role: (m.role || '').trim() }));
    if (cleaned.length > 0) programmeTeamJson = JSON.stringify(cleaned);
  }

  return prisma.eventContribution.create({
    data: {
      contributorName:    data.contributorName,
      contributionType:   data.contributionType,
      // Money fields
      amount:             data.contributionType === 'MONEY' ? roundAmount(data.amount) : null,
      paymentMethod:      data.contributionType === 'MONEY' ? (data.paymentMethod || 'CASH') : null,
      mpesaReceiptNo:     data.contributionType === 'MONEY' ? (data.mpesaReceiptNo || null) : null,
      bankName:           data.contributionType === 'MONEY' ? (data.bankName || null) : null,
      accountNo:          data.contributionType === 'MONEY' ? (data.accountNo || null) : null,
      idNumber:           data.contributionType === 'MONEY' ? (data.idNumber || null) : null,
      // In-Kind fields
      inKindCategory:     data.contributionType === 'IN_KIND' ? data.inKindCategory : null,
      inKindDescription:  data.contributionType === 'IN_KIND' ? data.inKindDescription : null,
      inKindOtherType:    data.contributionType === 'IN_KIND' && data.inKindCategory === 'OTHERS' ? data.inKindOtherType : null,
      // Event
      eventType:          data.eventType,
      eventName:          data.eventName,
      eventDate:          new Date(data.eventDate),
      programmeTeam:      programmeTeamJson,
      notes:              data.notes || null,
      recordedBy:         data.recordedBy,
    },
    include: {
      recordedByUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

async function updateEventContribution(id, data) {
  const updateData = {};

  if (data.contributorName !== undefined) updateData.contributorName = data.contributorName;
  if (data.contributionType !== undefined) updateData.contributionType = data.contributionType;
  if (data.amount !== undefined) updateData.amount = data.amount ? roundAmount(data.amount) : null;
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.mpesaReceiptNo !== undefined) updateData.mpesaReceiptNo = data.mpesaReceiptNo;
  if (data.bankName !== undefined) updateData.bankName = data.bankName;
  if (data.accountNo !== undefined) updateData.accountNo = data.accountNo;
  if (data.idNumber !== undefined) updateData.idNumber = data.idNumber;
  if (data.inKindCategory !== undefined) updateData.inKindCategory = data.inKindCategory;
  if (data.inKindDescription !== undefined) updateData.inKindDescription = data.inKindDescription;
  if (data.inKindOtherType !== undefined) updateData.inKindOtherType = data.inKindOtherType;
  if (data.eventType !== undefined) updateData.eventType = data.eventType;
  if (data.eventName !== undefined) updateData.eventName = data.eventName;
  if (data.eventDate !== undefined) updateData.eventDate = new Date(data.eventDate);
  if (data.notes !== undefined) updateData.notes = data.notes;

  if (data.programmeTeam !== undefined) {
    if (Array.isArray(data.programmeTeam) && data.programmeTeam.length > 0) {
      const cleaned = data.programmeTeam
        .filter((m) => m.name && m.name.trim())
        .map((m) => ({ name: m.name.trim(), role: (m.role || '').trim() }));
      updateData.programmeTeam = cleaned.length > 0 ? JSON.stringify(cleaned) : null;
    } else {
      updateData.programmeTeam = null;
    }
  }

  return prisma.eventContribution.update({
    where: { id },
    data: updateData,
    include: {
      recordedByUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

async function deleteEventContribution(id) {
  return prisma.eventContribution.delete({ where: { id } });
}

async function getEventSummary({ year, month }) {
  const now = new Date();
  const targetYear  = Number(year)  || now.getFullYear();
  const targetMonth = Number(month) || (now.getMonth() + 1);

  const periodStart = new Date(targetYear, targetMonth - 1, 1);
  const periodEnd   = new Date(targetYear, targetMonth, 0, 23, 59, 59);
  const periodWhere = { eventDate: { gte: periodStart, lte: periodEnd } };

  // Last month for delta
  const lmDate  = new Date(targetYear, targetMonth - 2, 1);
  const lastMonthStart = new Date(lmDate.getFullYear(), lmDate.getMonth(), 1);
  const lastMonthEnd   = new Date(targetYear, targetMonth - 1, 0, 23, 59, 59);
  const lastMonthWhere = { eventDate: { gte: lastMonthStart, lte: lastMonthEnd } };

  const [
    totalMoneyAgg, totalCount,
    lastMonthMoneyAgg,
    byContributionType,
    byEventType,
    byInKindCategory,
    recentContributions,
  ] = await Promise.all([
    // Total money amount this period
    prisma.eventContribution.aggregate({
      where: { ...periodWhere, contributionType: 'MONEY' },
      _sum: { amount: true }, _count: { id: true },
    }),
    // Total records this period
    prisma.eventContribution.count({ where: periodWhere }),
    // Last month money total (for delta)
    prisma.eventContribution.aggregate({
      where: { ...lastMonthWhere, contributionType: 'MONEY' },
      _sum: { amount: true },
    }),
    // Breakdown by MONEY vs IN_KIND
    prisma.eventContribution.groupBy({
      by: ['contributionType'],
      where: periodWhere,
      _count: { id: true },
      _sum: { amount: true },
    }),
    // Breakdown by event type (top 5 by count)
    prisma.eventContribution.groupBy({
      by: ['eventType', 'eventName'],
      where: periodWhere,
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    // In-Kind breakdown by category
    prisma.eventContribution.groupBy({
      by: ['inKindCategory'],
      where: { ...periodWhere, contributionType: 'IN_KIND' },
      _count: { id: true },
    }),
    // Recent contributions for sidebar
    prisma.eventContribution.findMany({
      where: periodWhere,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        recordedByUser: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const totalMoneyAmount = roundAmount(Number(totalMoneyAgg._sum.amount || 0));
  const lastMonthMoney   = roundAmount(Number(lastMonthMoneyAgg._sum.amount || 0));
  const totalRecords     = totalCount;
  const moneyCount       = totalMoneyAgg._count.id;
  const inKindCount      = totalCount - moneyCount;

  // Top event by contribution count
  const topEvent = byEventType[0]
    ? { name: byEventType[0].eventName, count: byEventType[0]._count.id }
    : null;

  return {
    totalMoneyAmount,
    lastMonthMoney,
    totalRecords,
    moneyCount,
    inKindCount,
    topEvent,
    byContributionType,
    byEventType,
    byInKindCategory,
    recentContributions,
    period: { year: targetYear, month: targetMonth },
  };
}

async function getEventYearlySummary({ year }) {
  const targetYear = Number(year) || new Date().getFullYear();
  const yearStart  = new Date(targetYear, 0, 1);
  const yearEnd    = new Date(targetYear, 11, 31, 23, 59, 59);
  const yearWhere  = { eventDate: { gte: yearStart, lte: yearEnd } };

  const prevYear   = targetYear - 1;
  const prevStart  = new Date(prevYear, 0, 1);
  const prevEnd    = new Date(prevYear, 11, 31, 23, 59, 59);
  const prevWhere  = { eventDate: { gte: prevStart, lte: prevEnd } };

  const [
    yearMoneyAgg, yearTotal,
    prevMoneyAgg,
    byEventType, byInKindCategory, byContributionType,
  ] = await Promise.all([
    prisma.eventContribution.aggregate({
      where: { ...yearWhere, contributionType: 'MONEY' },
      _sum: { amount: true }, _count: { id: true },
    }),
    prisma.eventContribution.count({ where: yearWhere }),
    prisma.eventContribution.aggregate({
      where: { ...prevWhere, contributionType: 'MONEY' },
      _sum: { amount: true },
    }),
    prisma.eventContribution.groupBy({
      by: ['eventType', 'eventName'],
      where: yearWhere,
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.eventContribution.groupBy({
      by: ['inKindCategory'],
      where: { ...yearWhere, contributionType: 'IN_KIND' },
      _count: { id: true },
    }),
    prisma.eventContribution.groupBy({
      by: ['contributionType'],
      where: yearWhere,
      _count: { id: true },
      _sum: { amount: true },
    }),
  ]);

  const totalMoneyAmount = roundAmount(Number(yearMoneyAgg._sum.amount || 0));
  const prevMoneyAmount  = roundAmount(Number(prevMoneyAgg._sum.amount || 0));

  return {
    year: targetYear,
    totalMoneyAmount,
    prevMoneyAmount,
    totalRecords: yearTotal,
    moneyCount: yearMoneyAgg._count.id,
    inKindCount: yearTotal - yearMoneyAgg._count.id,
    byEventType,
    byInKindCategory,
    byContributionType,
    topEvent: byEventType[0] ? { name: byEventType[0].eventName, count: byEventType[0]._count.id } : null,
  };
}

// Used by the reports/dashboard service to include events in Total Income
async function getEventsTotalForPeriod({ start, end }) {
  const agg = await prisma.eventContribution.aggregate({
    where: { contributionType: 'MONEY', eventDate: { gte: start, lte: end } },
    _sum: { amount: true },
    _count: { id: true },
  });
  return {
    total: roundAmount(Number(agg._sum.amount || 0)),
    count: agg._count.id,
  };
}

module.exports = {
  listEventContributions,
  getEventContributionById,
  createEventContribution,
  updateEventContribution,
  deleteEventContribution,
  getEventSummary,
  getEventYearlySummary,
  getEventsTotalForPeriod,
};
