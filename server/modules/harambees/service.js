const prisma = require('../../lib/prisma');
const { roundMoney } = require('../../lib/money');

async function getHarambeeById(id) {
  return prisma.harambee.findUnique({ where: { id } });
}

async function listHarambees(filters = {}) {
  const { page = 1, limit = 20, status } = filters;
  const skip = (page - 1) * limit;

  const where = {};
  where.status = status || 'ACTIVE';

  const [harambees, total] = await Promise.all([
    prisma.harambee.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { contributions: true } },
      },
    }),
    prisma.harambee.count({ where }),
  ]);

  const formatted = harambees.map((h) => ({
    ...h,
    targetAmount: roundMoney(h.targetAmount),
    currentAmount: roundMoney(h.currentAmount),
    contributionCount: h._count.contributions,
    progressPercentage: Number(h.targetAmount) > 0
      ? roundMoney((Number(h.currentAmount) / Number(h.targetAmount)) * 100)
      : 0,
  }));

  return { harambees: formatted, total, page, limit };
}

async function createHarambee(data) {
  const targetAmount = roundMoney(data.targetAmount);

  return prisma.harambee.create({
    data: {
      title: data.title,
      description: data.description || null,
      targetAmount,
      currentAmount: 0,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: 'ACTIVE',
      createdBy: data.createdBy,
    },
    include: {
      createdByUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

async function updateHarambee(id, data) {
  const updateData = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.targetAmount !== undefined) updateData.targetAmount = roundMoney(data.targetAmount);
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.status !== undefined) updateData.status = data.status;

  return prisma.harambee.update({
    where: { id },
    data: updateData,
    include: {
      createdByUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

async function deleteHarambee(id) {
  const harambee = await prisma.harambee.findUnique({ where: { id } });
  if (!harambee) throw new Error('HARAMBEE_NOT_FOUND');
  return prisma.$transaction(async (tx) => {
    await tx.harambeeContribution.deleteMany({ where: { harambeeId: id } });
    return tx.harambee.delete({ where: { id } });
  });
}

async function getHarambeeContributions(harambeeId, filters = {}) {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const harambee = await prisma.harambee.findUnique({
    where: { id: harambeeId },
  });

  if (!harambee) {
    return null;
  }

  const [contributions, total] = await Promise.all([
    prisma.harambeeContribution.findMany({
      where: { harambeeId },
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        recordedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.harambeeContribution.count({ where: { harambeeId } }),
  ]);

  return {
    harambee: {
      ...harambee,
      targetAmount: roundMoney(harambee.targetAmount),
      currentAmount: roundMoney(harambee.currentAmount),
    },
    contributions,
    total,
    page,
    limit,
  };
}

async function addHarambeeContribution(harambeeId, data) {
  // Check existence first so we return a clean P2025-style error (mapped to
  // 404 NOT_FOUND by the controller) instead of an opaque foreign-key
  // violation (P2003) when the parent harambee doesn't exist.
  const harambee = await prisma.harambee.findUnique({ where: { id: harambeeId } });
  if (!harambee) {
    const err = new Error('HARAMBEE_NOT_FOUND');
    err.code = 'P2025';
    throw err;
  }

  const amount = roundMoney(data.amount);

  return prisma.$transaction(async (tx) => {
    // Create the contribution
    const contribution = await tx.harambeeContribution.create({
      data: {
        harambeeId,
        contributorName: data.contributorName,
        amount,
        date: new Date(data.date),
        paymentMethod: (data.paymentMethod || 'CASH').toUpperCase(),
        mpesaReceiptNo: data.mpesaReceiptNo || null,
        notes: data.notes || null,
        recordedBy: data.recordedBy,
      },
      include: {
        recordedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Update harambee current amount
    const updated = await tx.harambee.update({
      where: { id: harambeeId },
      data: {
        currentAmount: { increment: amount },
      },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Check if target reached
    if (Number(updated.currentAmount) >= Number(updated.targetAmount)) {
      await tx.harambee.update({
        where: { id: harambeeId },
        data: { status: 'COMPLETED' },
      });
    }

    return contribution;
  });
}

module.exports = {
  getHarambeeById,
  listHarambees,
  createHarambee,
  updateHarambee,
  deleteHarambee,
  getHarambeeContributions,
  addHarambeeContribution,
};