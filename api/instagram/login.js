const crypto = require('crypto');
const { STATE_COOKIE, redirectUri } = require('../_lib/session');

module.exports = (req, res) => {
  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Missing INSTAGRAM_APP_ID environment variable. Set it in your Vercel project settings (Settings -> Environment Variables) and redeploy.');
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  res.setHeader('Set-Cookie', `${STATE_COOKIE}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

  const authUrl = 'https://www.instagram.com/oauth/authorize'
    + `?client_id=${encodeURIComponent(appId)}`
    + `&redirect_uri=${encodeURIComponent(redirectUri(req))}`
    + '&response_type=code'
    + `&scope=${encodeURIComponent('instagram_business_basic')}`
    + `&state=${state}`;

  res.statusCode = 302;
  res.setHeader('Location', authUrl);
  res.end();
};
