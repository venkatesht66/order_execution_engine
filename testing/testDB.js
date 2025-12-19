import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  const res = await pool.query("SELECT NOW()");
  console.log("DB connected at:", res.rows[0].now);
  await pool.end();
} catch (err) {
  console.error("DB error:", err.message);
}