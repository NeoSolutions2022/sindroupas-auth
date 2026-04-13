exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app_users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      password_hash text NOT NULL,
      name text,
      profile_id uuid NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();`);
  pgm.sql(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email text;`);
  pgm.sql(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash text;`);
  pgm.sql(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS name text;`);
  pgm.sql(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_id uuid;`);
  pgm.sql(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;`);
  pgm.sql(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();`);
  pgm.sql(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();`);

  pgm.sql(`
    UPDATE app_users
    SET is_active = COALESCE(is_active, true),
        created_at = COALESCE(created_at, now()),
        updated_at = COALESCE(updated_at, now())
  `);

  pgm.sql(`ALTER TABLE app_users ALTER COLUMN email SET NOT NULL;`);
  pgm.sql(`ALTER TABLE app_users ALTER COLUMN password_hash SET NOT NULL;`);
  pgm.sql(`ALTER TABLE app_users ALTER COLUMN profile_id SET NOT NULL;`);
  pgm.sql(`ALTER TABLE app_users ALTER COLUMN is_active SET NOT NULL;`);
  pgm.sql(`ALTER TABLE app_users ALTER COLUMN created_at SET NOT NULL;`);
  pgm.sql(`ALTER TABLE app_users ALTER COLUMN updated_at SET NOT NULL;`);

  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'app_users_pkey'
      ) THEN
        ALTER TABLE app_users ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);
      END IF;
    END $$;
  `);

  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'app_users_profile_id_fkey'
      ) THEN
        ALTER TABLE app_users
        ADD CONSTRAINT app_users_profile_id_fkey
        FOREIGN KEY (profile_id)
        REFERENCES app_profiles(id)
        ON DELETE RESTRICT;
      END IF;
    END $$;
  `);

  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_unique_idx ON app_users ((lower(email)));`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS app_users_profile_id_idx ON app_users (profile_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS app_users_is_active_idx ON app_users (is_active);`);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS app_users_is_active_idx;');
  pgm.sql('DROP INDEX IF EXISTS app_users_profile_id_idx;');
  pgm.sql('DROP INDEX IF EXISTS app_users_email_unique_idx;');
  pgm.sql('DROP TABLE IF EXISTS app_users;');
};
