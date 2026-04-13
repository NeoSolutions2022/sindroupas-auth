import { pool } from '../src/db/pool';
import { hashPassword } from '../src/auth/auth.service';

const OPERATIONAL_PROFILES = [
  {
    code: 'william_representatividade',
    email: 'william.representatividade@sindroupas.local',
    name: 'William Representatividade'
  },
  {
    code: 'diretor_comercial',
    email: 'diretor.comercial@sindroupas.local',
    name: 'Diretor Comercial'
  },
  {
    code: 'vice_presidente',
    email: 'vice.presidente@sindroupas.local',
    name: 'Vice Presidente'
  },
  {
    code: 'dir_evento_treinamento',
    email: 'dir.evento.treinamento@sindroupas.local',
    name: 'Dir. Evento e Treinamento'
  },
  {
    code: 'dir_inovacao_esg',
    email: 'dir.inovacao.esg@sindroupas.local',
    name: 'Dir. Inovação ESG'
  },
  {
    code: 'dir_financeiro',
    email: 'dir.financeiro@sindroupas.local',
    name: 'Dir. Financeiro'
  },
  {
    code: 'coordenacao_executiva',
    email: 'coordenacao.executiva@sindroupas.local',
    name: 'Coordenação Executiva'
  }
] as const;

const run = async () => {
  const initialPassword = process.env.APP_USERS_INITIAL_PASSWORD ?? 'SenhaInicial123!';
  const passwordHash = await hashPassword(initialPassword);

  for (const profile of OPERATIONAL_PROFILES) {
    const profileResult = await pool.query<{ id: string }>(
      `SELECT id
         FROM app_profiles
        WHERE code = $1
        LIMIT 1`,
      [profile.code]
    );

    const profileId = profileResult.rows[0]?.id;
    if (!profileId) {
      console.warn(`profile não encontrado: ${profile.code}`);
      continue;
    }

    await pool.query(
      `INSERT INTO app_users (email, password_hash, name, profile_id, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT ((lower(email)))
       DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name,
         profile_id = EXCLUDED.profile_id,
         is_active = EXCLUDED.is_active,
         updated_at = now()`,
      [profile.email, passwordHash, profile.name, profileId]
    );
  }

  console.log('seed app_users ok');
  await pool.end();
};

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
