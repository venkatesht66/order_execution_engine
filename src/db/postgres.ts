import pkg from "pg";
import "dotenv/config";
const { Pool } = pkg;


export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function saveOrder(
  orderId: string,
  status: string,
  meta: any = {}
) {
  await pool.query(
    `INSERT INTO orders(order_id, status, meta)
     VALUES ($1, $2, $3)
     ON CONFLICT (order_id)
     DO UPDATE SET
       status = $2,
       meta = $3,
       updated_at = NOW()`,
    [orderId, status, meta]
  );
}