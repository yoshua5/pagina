const { COOKIE_NAME, clearCookie } = require('../_lib/session');

module.exports = (req, res) => {
  clearCookie(res, COOKIE_NAME);
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true }));
};
