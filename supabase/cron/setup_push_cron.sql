-- Pré-requisitos (executados uma vez no SQL Editor, fora desta migração):
--   select vault.create_secret('https://<PROJECT_REF>.supabase.co', 'treino_plus_project_url');
--   select vault.create_secret('<SECRET_API_KEY_DO_PROJETO>', 'treino_plus_api_key');
--   select vault.create_secret('<MESMO_VALOR_DE_CRON_SECRET>', 'treino_plus_push_cron_secret');
-- Ative a extensão Supabase Vault se vault.create_secret ainda não existir.
-- Execute este arquivo somente depois de inserir esses três valores no Vault.

select cron.unschedule(jobid)
from cron.job
where jobname = 'treino-plus-send-push-reminders';

select cron.schedule(
  'treino-plus-send-push-reminders',
  '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret
              from vault.decrypted_secrets
              where name = 'treino_plus_project_url') || '/functions/v1/send-push-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'treino_plus_api_key'
        ),
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'treino_plus_push_cron_secret'
        )
      ),
      body := jsonb_build_object('source', 'pg_cron')
    ) as request_id;
  $job$
);
