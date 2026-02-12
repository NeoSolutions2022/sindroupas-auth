import { pool } from '../src/db/pool';
import { hashPassword } from '../src/auth/auth.service';

const run = async () => {
  const email = 'sindroupas@email';
  const password = 'admin123%';
  const passwordHash = await hashPassword(password);

  await pool.query(
    `INSERT INTO admin_users (email, password_hash, role, status, name)
     VALUES ($1, $2, 'admin', 'active', $3)
     ON CONFLICT (email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       status = EXCLUDED.status,
       name = EXCLUDED.name`,
    [email, passwordHash, 'Admin SindiRoupas']
  );

  console.log('seed ok');
  await pool.end();
};

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
