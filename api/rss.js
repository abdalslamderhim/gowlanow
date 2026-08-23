const { getPool } = require('../lib/db');

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

module.exports = async (req, res) => {
  const pool = getPool();
  const siteUrl = 'https://gowlanow.vercel.app';

  try {
    const { rows } = await pool.query(
      `SELECT * FROM articles
       WHERE status = 'published' OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now())
       ORDER BY id DESC LIMIT 20`
    );

    const items = rows
      .map((n) => {
        const link = `${siteUrl}/news/${n.id}`;
        const pubDate = new Date(n.created_at).toUTCString();
        return `  <item>
    <title>${esc(n.title)}</title>
    <link>${link}</link>
    <guid>${link}</guid>
    <pubDate>${pubDate}</pubDate>
    <category>${esc(n.category || '')}</category>
    <description>${esc(n.excerpt || '')}</description>
  </item>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>جولة</title>
  <link>${siteUrl}</link>
  <description>حيث التغطية والتوثيق</description>
  <language>ar</language>
${items}
</channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).send(xml);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
