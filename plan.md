# Plano — Supabase Auth e Web Push real

## Abordagem

Manter o Treino Plus como export estático servido por GitHub Pages e usar Supabase como backend. Reaproveitar `@supabase/supabase-js` e o padrão visual azul/branco existente. A área de notificações terá login real por magic link via Supabase Auth, separado e rotulado do login demo de compras/assinaturas. Uma Edge Function autenticada valida e grava a subscription com identidade obtida do JWT; uma segunda função usa uma credencial interna de cron, busca lembretes vencidos e envia Web Push com chaves VAPID exclusivamente server-side.

## Estrutura

- `src/components/PushNotificationSettings.tsx`: Auth email-link, status real de sessão, inscrição e remoção no endpoint.
- `src/lib/supabase/client.ts`: singleton browser client com variáveis NEXT_PUBLIC.
- `.github/workflows/pages.yml`: injeta apenas URL e chave pública Supabase durante o build estático.
- `supabase/config.toml`: configuração das Edge Functions.
- `supabase/migrations/`: tabelas, grants, RLS, função de claim e extensões `pg_cron`/`pg_net`.
- `supabase/functions/push-subscriptions/`: autentica o usuário e valida upsert/delete.
- `supabase/functions/send-push-reminders/`: endpoint interno VAPID, envia fila, desativa subscriptions expiradas.
- `supabase/cron/`: SQL para instalar segredos no Vault e agendar invocação via `pg_cron` + `pg_net`.

## Restrições

O repositório usa static export, então não haverá API Route Next.js em runtime. O projeto Supabase remoto precisa estar conectado e configurado antes do serviço operar. O envio real requer `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, URL do projeto e segredo interno do Supabase armazenados somente no backend/Vault. O cron trabalha em UTC e a data local é convertida pelo frontend considerando o fuso IANA. A entrega push é best-effort do navegador/plataforma.


## Extensão — Biblioteca de exercícios

Na rota existente `/treinos`, acrescentar um componente de biblioteca com grupos musculares expansíveis, busca por nome/grupo/equipamento e filtro por equipamento. O catálogo terá IDs estáveis em `src/lib/exercise-catalog.ts`, compartilhados com `Meu Plano` para não duplicar ou quebrar as referências locais existentes. O botão “Adicionar ao meu treino” registra seleção no store local da demonstração e, quando há Supabase Auth, faz upsert na tabela `public.user_selected_exercises`; sem backend/autenticação, a UI identifica que o salvamento é local. A migration cria tabela com snapshot e parâmetros (séries, reps, descanso), chave única por usuário/exercício, RLS e policies `auth.uid() = user_id`. A integração remota depende de aplicar a migration no projeto Supabase; nenhuma chave privada é usada no frontend.