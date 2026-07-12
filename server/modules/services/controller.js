const service = require('./service');
const { success, error } = require('../../lib/response');

async function list(req, res) {
  try {
    const { page, limit, upcoming } = req.query;
    const result = await service.listServices({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      upcoming: upcoming === 'true',
    });
    return success(res, result);
  } catch (err) {
    console.error('[Services] list error:', err);
    return error(res, 'Failed to fetch services.', 500, 'SERVER_ERROR');
  }
}

async function create(req, res) {
  try {
    const { name, dayOfWeek, time, serviceDate, topic, speaker,
            programmer, leadMinistrant, reader, notes, status, isActive } = req.body;

    if (!name || !dayOfWeek || !time) {
      return error(res, 'name, dayOfWeek, and time are required.', 400, 'VALIDATION_ERROR');
    }

    const svc = await service.createService({ name, dayOfWeek, time, serviceDate, topic, speaker, programmer, leadMinistrant, reader, notes, status, isActive });
    return success(res, { service: svc }, 201);
  } catch (err) {
    console.error('[Services] create error:', err);
    return error(res, 'Failed to create service.', 500, 'SERVER_ERROR');
  }
}

async function update(req, res) {
  try {
    const { name, dayOfWeek, time, serviceDate, topic, speaker,
            programmer, leadMinistrant, reader, notes, status, isActive } = req.body;

    const svc = await service.updateService(req.params.id, { name, dayOfWeek, time, serviceDate, topic, speaker, programmer, leadMinistrant, reader, notes, status, isActive });
    return success(res, { service: svc });
  } catch (err) {
    console.error('[Services] update error:', err);
    if (err.code === 'P2025') {
      return error(res, 'Service not found.', 404, 'NOT_FOUND');
    }
    return error(res, 'Failed to update service.', 500, 'SERVER_ERROR');
  }
}

async function destroy(req, res) {
  try {
    await service.deleteService(req.params.id);
    return success(res, { deleted: true });
  } catch (err) {
    console.error('[Services] delete error:', err);
    if (err.code === 'P2025') {
      return error(res, 'Service not found.', 404, 'NOT_FOUND');
    }
    return error(res, 'Failed to delete service.', 500, 'SERVER_ERROR');
  }
}

module.exports = { list, create, update, destroy };