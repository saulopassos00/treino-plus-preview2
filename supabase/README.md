# Backend de Web Push do Treino Plus

O site continua estático no GitHub Pages. O Supabase fornece Auth, Postgres e Edge Functions. A inscrição do browser, as categorias e os lembretes futuros nunca devem ser enviados para uma chave `service_role` no frontend.

## Antes de operar

1. Crie ou selecione um projeto Supabase e copie o Project Ref. No Supabase Auth, configure o Site URL e adicione exatamente `https://saulopassos00.github.io/treino-plus-preview2/account/` à lista de Redirect URLs. Ative e teste e-mail por magic link; para produção configure um provedor SMTP transacional.
2. No repositório GitHub, crie as **Actions Variables** `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (chave pública/publishable, não `service_role`). O workflow usa esses valores durante o `next build`. Faça novo build/deploy depois de gravá-los.
3. Instale a Supabase CLI, autentique-a no seu ambiente e rode `supabase link --project-ref <PROJECT_REF>`. Revise o projeto conectado antes de aplicar qualquer migration.
4. Rode `supabase db push` para criar as tabelas, policies RLS, funções de claim e substituição atômica da agenda semanal, a tabela `user_selected_exercises` com escolhas e parâmetros individuais, além de habilitar `pg_cron`/`pg_net`.
5. Cadastre os secrets das Edge Functions no Dashboard ou com CLI. A chave pública VAPID **deve corresponder** à chave compilada no componente; a privada nunca sai do servidor:

```sh
supabase secrets set \
  VAPID_PUBLIC_KEY='BOnuSxClLfPgbRUuNDZpcov3KhuUGKUTXOgN0PE8_Qf4SrnKuzS1RjNgfACF0pnszC54DzeHRzYo8Ci9XO5s-Oo' \
  VAPID_PRIVATE_KEY='<CHAVE_PRIVADA_VAPID>' \
  VAPID_SUBJECT='mailto:<EMAIL_DE_CONTATO>' \
  CRON_SECRET='<SEGREDO_ALEATORIO_COM_PELO_MENOS_32_CARACTERES>' \
  CORS_ORIGIN='https://saulopassos00.github.io'
```

Gere `CRON_SECRET` com um gerador criptográfico e guarde o mesmo valor como secret da função e no Supabase Vault. Não publique a chave privada nem o cron secret em Issues, logs, chat, `NEXT_PUBLIC_*`, GitHub Pages ou commits.

6. Publique as três funções:

```sh
supabase functions deploy push-subscriptions
supabase functions deploy sync-weekly-reminders
supabase functions deploy send-push-reminders
```

## Agendamento no banco

Abra o SQL Editor do Supabase como administrador. Insira no Vault a URL do projeto e o mesmo segredo de cron (o arquivo SQL não contém valores secretos):

```sql
select vault.create_secret('https://<PROJECT_REF>.supabase.co', 'treino_plus_project_url');
select vault.create_secret('<SUPABASE_SECRET_API_KEY>', 'treino_plus_api_key');
select vault.create_secret('<MESMO_VALOR_DE_CRON_SECRET>', 'treino_plus_push_cron_secret');
```

Depois de aplicar a migration e habilitar Vault, execute `supabase/cron/setup_push_cron.sql` no SQL Editor. A chave API secreta é usada apenas no cabeçalho interno da chamada e nunca no frontend. O agendamento chama a função a cada minuto; o horário escolhido no navegador é convertido em UTC e armazenado como `timestamptz`. Para inspecionar o agendamento e execuções, consulte `cron.job` e `cron.job_run_details`. `pg_net` está em beta segundo a documentação Supabase, então monitore as respostas e os erros após atualizações da plataforma.

## Fluxo implementado

- `push-subscriptions` exige JWT Supabase, valida endpoint HTTPS e chaves, associa `user_id` ao usuário validado e grava usando RLS. A ação `delete` remove só a inscrição do usuário autenticado.
- `sync-weekly-reminders` exige JWT, valida a data no fuso enviado e substitui a agenda semanal por um RPC transacional; aceita apenas atividades fixas da rotina e confirma que a categoria de push semanal está ativa.
- `send-push-reminders` não aceita JWT público; exige o segredo de cron, reclama uma fila com lock `SKIP LOCKED`, envia Web Push VAPID, retenta falhas transitórias e desativa endpoints que respondam 404/410.
- `user_selected_exercises` guarda IDs estáveis do catálogo e snapshots de nome, grupo, equipamento, nível, séries, repetições, descanso e notas. RLS limita leitura, gravação, atualização e exclusão ao usuário autenticado dono da linha.

A entrega depende de suporte do navegador e do serviço push e é best-effort. A verificação remota completa requer um projeto Supabase acessível; `supabase db push`, a implantação das funções e o SQL do Vault/cron não devem ser executados sem confirmar o Project Ref correto.
