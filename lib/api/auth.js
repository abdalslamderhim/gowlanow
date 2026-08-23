// نظام توثيق بسيط قائم على HMAC — كلمة المرور نفسها لا تُخزَّن أبدًا في الكود،
// بل في متغير بيئة (ADMIN_PASSWORD) على Vercel، والتوكن الموقّع صالح لمدة محدودة فقط.
const crypto = require('crypto');

function getSecret() {
  return process.env.TOKEN_SECRET || process.env.ADMIN_PASSWORD || 'gowla-fallback-secret';
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function isAuthed(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  return !!verify(token);
}

module.exports = { sign, verify, isAuthed };

