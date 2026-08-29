const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    // نفضّل رابط Supabase الجديد؛ ولو غير موجود نرجع للقديم كحل احتياطي
    const conn = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!conn) {
      throw new Error('لا يوجد رابط اتصال بقاعدة البيانات (SUPABASE_DATABASE_URL). تأكد من إضافته في Vercel.');
    }
    pool = new Pool({
      connectionString: conn,
      ssl: { rejectUnauthorized: false },
      max: 1,                 // كل نسخة serverless تكتفي باتصال واحد أو اثنين
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    // تجنب انهيار الدالة كاملة لو حدث خطأ على اتصال خامل في الـ pool
    pool.on('error', (err) => {
      console.error('Unexpected PG pool error:', err.message);
    });
  }
  return pool;
}

module.exports = { getPool };
