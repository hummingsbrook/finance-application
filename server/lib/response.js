function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function error(res, message, statusCode = 400, code = 'GENERIC_ERROR') {
  return res.status(statusCode).json({ success: false, message, code });
}

module.exports = { success, error };