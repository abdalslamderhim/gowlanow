const { sign } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const real = process.env.ADMIN_PASSWORD;
  if (!real) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD غير مضبوطة في إعدادات Vercel (Settings → Environment Variables).' });
  }

  const body = req.body || {};
  if (body.password !== real) {
    return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
  }

  const token = sign({ role: 'admin', exp: Date.now() + 1000 * 60 * 60 * 12 }); // صلاحية 12 ساعة
  return res.status(200).json({ token });
};

