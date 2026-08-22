Enterconst { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    const conn = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!conn) {
      throw new Error('لا يوجد رابط اتصال بقاعدة البيانات (NETLIFY_DATABASE_URL). تأكد من ربط Netlify DB بالمشروع.');
    }
    pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

module.exports = { getPool };
