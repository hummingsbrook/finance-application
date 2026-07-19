const service = require('./service');
const { success, error } = require('../../lib/response');

async function financialSummary(req, res) {
  try {
    const result = await service.getFinancialSummary();
    return success(res, result);
  } catch (err) {
    console.error('[reports.financialSummary] error:', err);
    return error(res, 'Failed to generate financial summary.', 500, 'SERVER_ERROR');
  }
}

async function monthly(req, res) {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (isNaN(year) || year < 2000 || year > 2100) {
      return error(res, 'Invalid year.', 400, 'VALIDATION_ERROR');
    }

    if (isNaN(month) || month < 1 || month > 12) {
      return error(res, 'Invalid month. Must be 1-12.', 400, 'VALIDATION_ERROR');
    }

    const result = await service.getMonthlyReport(year, month);
    return success(res, result);
  } catch (err) {
    console.error('[reports.monthly] error:', err);
    return error(res, 'Failed to generate monthly report.', 500, 'SERVER_ERROR');
  }
}

async function dashboard(req, res) {
  try {
    const year = req.query.year ? parseInt(req.query.year) : undefined;
    const month = req.query.month ? parseInt(req.query.month) : undefined;

    if (year !== undefined && (isNaN(year) || year < 2000 || year > 2100)) {
      return error(res, 'Invalid year.', 400, 'VALIDATION_ERROR');
    }
    if (month !== undefined && (isNaN(month) || month < 1 || month > 12)) {
      return error(res, 'Invalid month. Must be 1-12.', 400, 'VALIDATION_ERROR');
    }

    const result = await service.getDashboardData({ year, month });
    return success(res, result);
  } catch (err) {
    console.error('[reports.dashboard] error:', err);
    return error(res, 'Failed to load dashboard.', 500, 'SERVER_ERROR');
  }
}

async function dashboardYearly(req, res) {
  try {
    const year = req.query.year ? parseInt(req.query.year) : undefined;
    if (year !== undefined && (isNaN(year) || year < 2000 || year > 2100)) {
      return error(res, 'Invalid year.', 400, 'VALIDATION_ERROR');
    }
    const result = await service.getYearlyDashboardData({ year });
    return success(res, result);
  } catch (err) {
    console.error('[reports.dashboardYearly] error:', err);
    return error(res, 'Failed to load yearly dashboard.', 500, 'SERVER_ERROR');
  }
}

// ── New controllers for the rebuilt Reports.jsx ──────────────────────────────

async function summary(req, res) {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    if (isNaN(year) || year < 2000 || year > 2100) {
      return error(res, 'Invalid year.', 400, 'VALIDATION_ERROR');
    }
    if (isNaN(month) || month < 1 || month > 12) {
      return error(res, 'Invalid month. Must be 1-12.', 400, 'VALIDATION_ERROR');
    }

    const result = await service.getSummary(year, month);
    return success(res, result);
  } catch (err) {
    console.error('[reports.summary] error:', err);
    return error(res, 'Failed.', 500, 'SERVER_ERROR');
  }
}

async function breakdown(req, res) {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    // Only run the expensive activities queries when the caller explicitly opts in.
    // The Statement of Activities UI tab has been removed, so the default is false.
    const includeActivities = req.query.includeActivities === 'true';

    if (isNaN(year) || year < 2000 || year > 2100) {
      return error(res, 'Invalid year.', 400, 'VALIDATION_ERROR');
    }
    if (isNaN(month) || month < 1 || month > 12) {
      return error(res, 'Invalid month. Must be 1-12.', 400, 'VALIDATION_ERROR');
    }

    const result = await service.getBreakdown(year, month, includeActivities);
    return success(res, result);
  } catch (err) {
    console.error('[reports.breakdown] error:', err);
    return error(res, 'Failed.', 500, 'SERVER_ERROR');
  }
}

async function summaryYearly(req, res) {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    if (isNaN(year) || year < 2000 || year > 2100)
      return error(res, 'Invalid year.', 400, 'VALIDATION_ERROR');
    const result = await service.getSummaryYearly(year);
    return success(res, result);
  } catch (err) {
    console.error('[reports.summaryYearly] error:', err);
    return error(res, 'Failed.', 500, 'SERVER_ERROR');
  }
}

async function breakdownYearly(req, res) {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const includeActivities = req.query.includeActivities === 'true';

    if (isNaN(year) || year < 2000 || year > 2100)
      return error(res, 'Invalid year.', 400, 'VALIDATION_ERROR');

    const result = await service.getBreakdownYearly(year, includeActivities);
    return success(res, result);
  } catch (err) {
    console.error('[reports.breakdownYearly] error:', err);
    return error(res, 'Failed.', 500, 'SERVER_ERROR');
  }
}

async function trend(req, res) {
  try {
    let months = parseInt(req.query.months) || 6;
    if (months > 24) months = 24;
    if (months < 1) months = 6;

    const result = await service.getTrend(months);
    return success(res, result);
  } catch (err) {
    console.error('[reports.trend] error:', err);
    return error(res, 'Failed.', 500, 'SERVER_ERROR');
  }
}

async function generateNarrative(req, res) {
  try {
    const { reportData, language } = req.body || {};

    if (!reportData) {
      return error(res, 'reportData required.', 400, 'VALIDATION_ERROR');
    }

    const lang = ['english', 'kiswahili'].includes(language) ? language : 'english';

    const result = await service.generateNarrativeGemini(reportData, lang);
    return success(res, result);
  } catch (err) {
    console.error('[reports.generateNarrative] error:', err);
    return error(res, 'Failed.', 500, 'SERVER_ERROR');
  }
}

module.exports = {
  financialSummary,
  monthly,
  dashboard,
  dashboardYearly,
  summary,
  breakdown,
  summaryYearly,
  breakdownYearly,
  trend,
  generateNarrative,
};
