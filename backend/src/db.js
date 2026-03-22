const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => console.log('✅ Connected to PostgreSQL'));
pool.on('error',   (err) => console.error('❌ PostgreSQL error:', err));
pool.connect((err) => {
  if (err) console.error('❌ DB connection failed:', err.message);
  else console.log('✅ Connected to PostgreSQL');
});
module.exports = pool;
//reee