exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'app_users'
          AND column_name = 'auth_user_id'
      ) THEN
        WITH defaults AS (
          SELECT *
          FROM (
            VALUES
              ('william_representatividade', 'William', 'william.representatividade@sindroupas.local', 'William@123'),
              ('diretor_comercial', 'Diretor Comercial', 'diretor.comercial@sindroupas.local', 'DiretorComercial@123'),
              ('vice_presidente', 'Vice-Presidente', 'vice.presidente@sindroupas.local', 'VicePresidente@123'),
              ('dir_evento_treinamento', 'Dir. Evento e Treinamento', 'dir.evento.treinamento@sindroupas.local', 'DirEventoTreinamento@123'),
              ('dir_inovacao_esg', 'Dir. Inovação e ESG', 'dir.inovacao.esg@sindroupas.local', 'DirInovacaoESG@123'),
              ('dir_financeiro', 'Dir. Financeiro', 'dir.financeiro@sindroupas.local', 'DirFinanceiro@123'),
              ('coordenacao_executiva', 'Coordenação Executiva', 'coordenacao.executiva@sindroupas.local', 'CoordenacaoExecutiva@123')
          ) AS t(profile_code, name, email, raw_password)
        ),
        candidates AS (
          SELECT d.profile_code,
                 d.name,
                 lower(d.email) AS email,
                 d.raw_password,
                 p.id AS profile_id
          FROM defaults d
          INNER JOIN app_profiles p ON p.code = d.profile_code
          WHERE d.profile_code <> 'admin'
        )
        INSERT INTO app_users (email, password_hash, name, profile_id, is_active, auth_user_id)
        SELECT c.email,
               crypt(c.raw_password, gen_salt('bf', 12)),
               c.name,
               c.profile_id,
               true,
               gen_random_uuid()
        FROM candidates c
        WHERE NOT EXISTS (
          SELECT 1
          FROM app_users u
          WHERE lower(u.email) = c.email
             OR u.profile_id = c.profile_id
        );
      ELSE
        WITH defaults AS (
          SELECT *
          FROM (
            VALUES
              ('william_representatividade', 'William', 'william.representatividade@sindroupas.local', 'William@123'),
              ('diretor_comercial', 'Diretor Comercial', 'diretor.comercial@sindroupas.local', 'DiretorComercial@123'),
              ('vice_presidente', 'Vice-Presidente', 'vice.presidente@sindroupas.local', 'VicePresidente@123'),
              ('dir_evento_treinamento', 'Dir. Evento e Treinamento', 'dir.evento.treinamento@sindroupas.local', 'DirEventoTreinamento@123'),
              ('dir_inovacao_esg', 'Dir. Inovação e ESG', 'dir.inovacao.esg@sindroupas.local', 'DirInovacaoESG@123'),
              ('dir_financeiro', 'Dir. Financeiro', 'dir.financeiro@sindroupas.local', 'DirFinanceiro@123'),
              ('coordenacao_executiva', 'Coordenação Executiva', 'coordenacao.executiva@sindroupas.local', 'CoordenacaoExecutiva@123')
          ) AS t(profile_code, name, email, raw_password)
        ),
        candidates AS (
          SELECT d.profile_code,
                 d.name,
                 lower(d.email) AS email,
                 d.raw_password,
                 p.id AS profile_id
          FROM defaults d
          INNER JOIN app_profiles p ON p.code = d.profile_code
          WHERE d.profile_code <> 'admin'
        )
        INSERT INTO app_users (email, password_hash, name, profile_id, is_active)
        SELECT c.email,
               crypt(c.raw_password, gen_salt('bf', 12)),
               c.name,
               c.profile_id,
               true
        FROM candidates c
        WHERE NOT EXISTS (
          SELECT 1
          FROM app_users u
          WHERE lower(u.email) = c.email
             OR u.profile_id = c.profile_id
        );
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM app_users
    WHERE lower(email) IN (
      'william.representatividade@sindroupas.local',
      'diretor.comercial@sindroupas.local',
      'vice.presidente@sindroupas.local',
      'dir.evento.treinamento@sindroupas.local',
      'dir.inovacao.esg@sindroupas.local',
      'dir.financeiro@sindroupas.local',
      'coordenacao.executiva@sindroupas.local'
    );
  `);
};
