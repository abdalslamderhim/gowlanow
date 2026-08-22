const { sign } = require('./_auth');

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(data),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method not allowed' });

  const real = process.env.ADMIN_PASSWORD;
  if (!real) {
    return json(500, { error: 'ADMIN_PASSWORD غير مضبوطة في إعدادات Netlify (Site configuration → Environment variables).' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'طلب غير صالح' });
  }

  if (body.password !== real) {
    return json(401, { error: 'كلمة المرور غير صحيحة' });
  }

  const token = sign({ role: 'admin', exp: Date.now() + 1000 * 60 * 60 * 12 }); // صلاحية 12 ساعة
  return json(200, { token });
};
