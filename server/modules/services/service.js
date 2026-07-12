const prisma = require('../../lib/prisma');

async function listServices(filters = {}) {
  const MAX_LIMIT = 100;
  const { page = 1, upcoming } = filters;
  const limit = Math.min(parseInt(filters.limit) || 50, MAX_LIMIT);
  const skip = (page - 1) * limit;
  const where = {};

  // If upcoming = true, only return services with serviceDate >= today
  if (upcoming) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    where.serviceDate = { gte: today };
  }

  const [services, total] = await Promise.all([
    prisma.churchService.findMany({
      where,
      skip,
      take: limit,
      orderBy: upcoming
        ? { serviceDate: 'asc' }   // nearest first for upcoming
        : { serviceDate: 'desc' }, // newest first for records view
    }),
    prisma.churchService.count({ where }),
  ]);

  return { services, total, page, limit };
}

async function createService(data) {
  const VALID_STATUSES = ['SCHEDULED', 'INCOMPLETE', 'COMPLETED'];
  const status = VALID_STATUSES.includes(data.status) ? data.status : 'SCHEDULED';
  return prisma.churchService.create({
    data: {
      name: data.name,
      dayOfWeek: data.dayOfWeek,
      time: data.time,
      serviceDate: data.serviceDate ? new Date(data.serviceDate) : null,
      topic: data.topic || null,
      speaker: data.speaker || null,
      programmer: data.programmer || null,
      leadMinistrant: data.leadMinistrant || null,
      reader: data.reader || null,
      notes: data.notes || null,
      status,
      isActive: data.isActive ?? true,
    },
  });
}

async function updateService(id, data) {
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
  if (data.time !== undefined) updateData.time = data.time;
  if (data.serviceDate !== undefined) {
    updateData.serviceDate = data.serviceDate ? new Date(data.serviceDate) : null;
  }
  if (data.topic !== undefined) updateData.topic = data.topic;
  if (data.speaker !== undefined) updateData.speaker = data.speaker;
  if (data.programmer !== undefined) updateData.programmer = data.programmer;
  if (data.leadMinistrant !== undefined) updateData.leadMinistrant = data.leadMinistrant;
  if (data.reader !== undefined) updateData.reader = data.reader;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined) {
    const VALID_STATUSES = ['SCHEDULED', 'INCOMPLETE', 'COMPLETED'];
    updateData.status = VALID_STATUSES.includes(data.status) ? data.status : updateData.status;
  }
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return prisma.churchService.update({
    where: { id },
    data: updateData,
  });
}

async function deleteService(id) {
  return prisma.churchService.delete({ where: { id } });
}

module.exports = {
  listServices,
  createService,
  updateService,
  deleteService,
};