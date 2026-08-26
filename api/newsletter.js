const { getPool } = require('../lib/db');
const { isAuthed } = require('../lib/auth');

module.exports = async (req, res) => {
  const pool = getPool();
  const qs = req.query || {};
  const body = req.body || {};
  const siteUrl = 'https://gowlanow.vercel.app';

  try {
    // ---- إرسال النشرة (إداري) ----
    if (req.method === 'POST' && qs.action === 'send') {
      if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      const FROM_EMAIL = process.env.NEWSLETTER_FROM || 'جولة <onboarding@resend.dev>';
      if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY غير مضبوط في إعدادات Vercel' });

      const { rows: subs } = await pool.query('SELECT email FROM subscribers');
      if (!subs.length) return res.status(200).json({ ok: true, sent: 0, total: 0, message: 'لا يوجد مشتركون بعد' });

      const { rows: latest } = await pool.query(`SELECT id, title, excerpt FROM articles WHERE status = 'published' ORDER BY id DESC LIMIT 6`);
      if (!latest.length) return res.status(200).json({ ok: true, sent: 0, total: subs.length, message: 'لا توجد أخبار منشورة' });

      const itemsHtml = latest.map(n => `
        <tr><td style="padding:12px 0;border-bottom:1px solid #eee">
          <a href="${siteUrl}/news/${n.id}" style="text-decoration:none;color:#111;font-weight:bold;font-size:16px">${n.title}</a>
          <p style="color:#666;font-size:13px;margin:4px 0 0">${n.excerpt || ''}</p>
        </td></tr>`).join('');

      const html = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1439d8">أهم أخبار جولة</h2>
        <table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>
        <p style="margin-top:24px"><a href="${siteUrl}" style="color:#1439d8">زيارة الموقع ←</a></p>
      </div>`;

      let sent = 0;
      for (const s of subs) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: FROM_EMAIL, to: s.email, subject: 'أهم أخبار جولة', html }),
          });
          sent++;
        } catch { /* تجاهل فشل بريد واحد */ }
      }
      return res.status(200).json({ ok: true, sent, total: subs.length });
    }

    // ---- الاشتراك (عام) ----
    if (req.method === 'POST') {
      const email = (body.email || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'بريد إلكتروني غير صالح' });
      }
      await pool.query('INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email]);
      return res.status(200).json({ ok: true });
    }

    // ---- قائمة المشتركين (إداري) ----
    if (req.method === 'GET') {
      if (!isAuthed(req)) return res.status(401).json({ error: 'غير مصرح' });
      const { rows } = await pool.query('SELECT * FROM subscribers ORDER BY id DESC');
      return res.status(200).json(rows);
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
