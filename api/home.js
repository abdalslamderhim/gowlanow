const { getPool } = require('../lib/db');

module.exports = async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT id,title,excerpt,body,image,category,reporter,time_label,views,
             featured,breaking,is_live,video_url,created_at
      FROM articles
      WHERE status = 'published'
         OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now())
      ORDER BY id DESC
      LIMIT 60
    `);
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','s-maxage=30, stale-while-revalidate=120');
    res.status(200).json({articles: rows});
  } catch (err) {
    res.status(500).json({error:'تعذر تحميل الأخبار'});
  }
};
