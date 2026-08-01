// Pool de conexao com o PostgreSQL hospedado (ex: Neon, Supabase, Render Postgres).
// A connection string vem da variavel de ambiente DATABASE_URL.
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.warn('[db] ATENCAO: DATABASE_URL nao configurada. Configure-a no .env (local) ou nas variaveis de ambiente do servico (Render).');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // A maioria dos provedores gratuitos (Neon, Supabase, Render) exige SSL.
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

/**
 * Aplica o schema.sql (idempotente - so cria o que ainda nao existe).
 * Chamado uma vez na subida do servidor.
 */
async function initSchema() {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(schema);
}

module.exports = { pool, initSchema };
