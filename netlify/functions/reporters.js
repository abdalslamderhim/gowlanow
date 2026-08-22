const { getPool } = require('./_db');
const { isAuthed } = require('./_auth');

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(data),
  };
}

exports.handler = async (event) => {
  const pool = getPool();
  const method = event.httpMethod;
  const qs = event.queryStringParameters || {};

  try {
    if (method === 'GET') {
      const authed = isAuthed(event);
      let text = 'SELECT * FROM reporters';
      const params = [];
      if (!authed) {
        text += ' WHERE active = true';
      }
      text += ' ORDER BY id ASC';
      const { rows } = await pool.query(text, params);
      return json(200, rows);
    }

    if (!isAuthed(event)) return json(401, { error: 'غير مصرح — سجّل الدخول أولاً' });

    if (method === 'POST') {
      const b = JSON.parse(event.body || '{}');
      const { rows } = await pool.query(
        `INSERT INTO reporters (name, role, region, active) VALUES ($1,$2,$3,$4) RETURNING *`,
        [b.name || 'مراسل جديد', b.role || 'مراسل جولة', b.region || '', b.active !== false]
      );
      return json(200, rows[0]);
    }

    if (method === 'PUT') {
      const b = JSON.parse(event.body || '{}');
      if (!b.id) return json(400, { error: 'id مطلوب' });
      const { rows } = await pool.query(
        `UPDATE reporters SET name=$1, role=$2, region=$3, active=$4 WHERE id=$5 RETURNING *`,
        [b.name, b.role, b.region, b.active !== false, b.id]
      );
      return json(200, rows[0]);
    }

    if (method === 'DELETE') {
      const id = qs.id;
      if (!id) return json(400, { error: 'id مطلوب' });
      const { rows } = await pool.query(
        `UPDATE reporters SET active=false WHERE id=$1 RETURNING *`,
        [id]
      );
      return json(200, rows[0]);
    }

    return json(405, { error: 'method not allowed' });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
