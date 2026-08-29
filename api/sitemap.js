const { getPool } = require('../lib/db');

module.exports = async (req, res) => {
  const pool = getPool();
  const siteUrl = 'https://gowlanow.vercel.app';

  try {
    const { rows } = await pool.query(
      `SELECT id, updated_at, created_at FROM articles
       WHERE status = 'published' OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now())
       ORDER BY id DESC LIMIT 1000`
    );

    const staticPages = [
      { loc: `${siteUrl}/`, priority: '1.0' },
      { loc: `${siteUrl}/about`, priority: '0.5' },
    ];

    const articleUrls = rows.map((a) => ({
      loc: `${siteUrl}/news/${a.id}`,
      lastmod: new Date(a.updated_at || a.created_at).toISOString(),
      priority: '0.8',
    }));

    const urlEntries = [
      ...staticPages.map((p) => `  <url>\n    <loc>${p.loc}</loc>\n    <priority>${p.priority}</priority>\n  </url>`),
      ...articleUrls.map((a) => `  <url>\n    <loc>${a.loc}</loc>\n    <lastmod>${a.lastmod}</lastmod>\n    <priority>${a.priority}</priority>\n  </url>`),
    ].join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(xml);
  } catch (err) {
    res.status(500).send(`<?xml version="1.0"?><error>${err.message}</error>`);
  }
};
