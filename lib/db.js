const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    const conn = process.env.DATABASE_URL;
    if (!conn) {
      throw new Error('لا يوجد رابط اتصال بقاعدة البيانات (DATABASE_URL). تأكد من ربط Neon بالمشروع من تبويب Storage.');
    }
    pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

module.exports = { getPool };

