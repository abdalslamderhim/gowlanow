const { getPool } = require('../lib/db');

module.exports = async (req, res) => {
  const pool = getPool();
  const siteUrl = 'https://gowlanow.vercel.app';

  try {
    const { rows } = await pool.query(
      `SELECT id, category, updated_at, created_at FROM articles
       WHERE status = 'published' OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now())
       ORDER BY id DESC`
    );

    const urls = rows
      .map((n) => {
        const lastmod = new Date(n.updated_at || n.created_at).toISOString();
        return `  <url>
    <loc>${siteUrl}/news/${n.id}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
      })
      .join('\n');

    const categories = [...new Set(rows.map((n) => n.category).filter(Boolean))];
    const catUrls = categories
      .map((c) => `  <url>
    <loc>${siteUrl}/category/${encodeURIComponent(c)}</loc>
  </url>`)
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
  </url>
${urls}
${catUrls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).send(xml);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
