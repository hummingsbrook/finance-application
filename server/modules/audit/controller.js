const service = require('./service');
const { success, error } = require('../../lib/response');

async function getLogs(req, res) {
  try {
    const { page, limit, userId, module: moduleName, action, startDate, endDate, search } = req.query;
    const result = await service.getAuditLogs({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      userId,
      module: moduleName,
      action,
      startDate,
      endDate,
      search,
    });
    return success(res, result);
  } catch (err) {
    return error(res, 'Failed to fetch audit logs.', 500, 'SERVER_ERROR');
  }
}

async function loginHistory(req, res) {
  try {
    const result = await service.getLoginHistory({
      page:      req.query.page,
      limit:     req.query.limit || 20,
      action:    req.query.action,
      startDate: req.query.startDate,
      endDate:   req.query.endDate,
      search:    req.query.search,
    });
    return success(res, result);
  } catch (err) {
    console.error('[audit.loginHistory] error:', err);
    return error(res, 'Failed to load login history.', 500, 'SERVER_ERROR');
  }
}

module.exports = { getLogs, loginHistory };
