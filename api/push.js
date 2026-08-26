const { getPool } = require('../lib/db');
const { isAuthed } = require('../lib/auth');

module.exports = async (req, res) => {
  const pool = getPool();
  const qs = req.query || {};
  const body = req.body || {};

  try {
    // ---- مفتاح VAPID العام ----
    if (req.method === 'GET' && qs.action === 'vapid-key') {
      return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
    }

    // ---- إرسال تنبيه لكل المشتركين (إداري) ----
    if (req.method === 'POST' && qs.action === 'send') {
      if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
      const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return res.status(500).json({ error: 'مفاتيح VAPID غير مضبوطة في إعدادات Vercel' });
      }
      const webpush = require('web-push');
      webpush.setVapidDetails('mailto:admin@gowlanow.vercel.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

      const { rows } = await pool.query('SELECT id, subscription FROM push_subscriptions');
      const payload = JSON.stringify({ title: body.title || 'خبر جديد من جولة', body: body.body || '', url: body.url || '/' });

      let sent = 0;
      for (const row of rows) {
        try {
          await webpush.sendNotification(row.subscription, payload);
          sent++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [row.id]);
          }
        }
      }
      return res.status(200).json({ ok: true, sent, total: rows.length });
    }

    // ---- تخزين اشتراك جديد (عام) ----
    if (req.method === 'POST') {
      if (!body.endpoint) return res.status(400).json({ error: 'اشتراك غير صالح' });
      await pool.query('INSERT INTO push_subscriptions (subscription) VALUES ($1)', [JSON.stringify(body)]);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
