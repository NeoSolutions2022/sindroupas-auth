import { pool } from '../src/db/pool';
import { bootstrapDefaultAppUsers } from '../src/auth/app-user-bootstrap';

const run = async () => {
  const result = await bootstrapDefaultAppUsers();

  console.log(`app_users bootstrap -> created: ${result.created.length}, skipped: ${result.skipped.length}`);
  await pool.end();
};

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
