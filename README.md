# Treino Plus

App mobile-first de bem-estar e fitness (UI em **PT-BR**): treinos, lives gravadas, Premium demonstrativo, **protocolos**, Fast Trainer, corrida, adaptações, nutrição, ebook e loja.

Versão estática demonstrativa — login, compras, assinatura e progresso persistem em `localStorage` (`treino-live-demo-v2`); não processa cobranças reais.

## Como rodar

```bash
cd treino-live
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).
Layout pensado para ~430px (mobile). Sem fake phone bezel.

```bash
npm run build && npm start   # produção local
```

## Feature map / rotas

| Rota | Tela | Notas |
|------|------|--------|
| `/` | Início / Home | Acesso a treinos, rotina semanal e módulos já disponíveis |
| `/semana` | Minha semana | Roteiro configurável por data local; atividades existentes, descanso e conclusão manual por dia |
| `/treinos` | Hub de treinos | Fast Trainer, protocolos Inter/Avançado, métodos, grid de grupos musculares com silhuetas |
| `/treinos/protocolo/inter` | Protocolo Intermediário | Sessões; exercícios editáveis, removíveis, ordenáveis e marcáveis como concluídos; progresso por exercício |
| `/treinos/protocolo/avancado` | Protocolo Avançado | Blocos de periodização com os mesmos controles de exercícios e progresso |
| `/treinos/fast` | Fast / Quicky Trainer | Timer real (work/rest · 4 rounds) → toast + streak |
| `/treinos/corpo/[part]` | Grupo muscular | Peito, Costas, Bíceps, Tríceps, Ombros, Glúteo, Pernas, Full, Core |
| `/corrida` | Hub corrida | 0→5 km e 0→10 km |
| `/corrida/5k` · `/corrida/10k` | Programa | Semanas/fases + dias marcáveis |
| `/adaptacoes` | Hub adaptações | Lipedema, gestação, joelho, coluna |
| `/adaptacoes/[id]` | Detalhe | Exercícios + salvar no plano |
| `/ebook` | Ebook nutri | Capa + capítulos marcáveis como lidos |
| `/loja` | Marketplace | Grid com preços · buy demo → owned |
| `/library` | Biblioteca VOD | 6 treinos VOD; preço de referência e liberação demonstrativa |
| `/workout/[id]` | Detalhe VOD | Prévia local; não processa cobranças |
| `/live/free` | Sala Free Live | Prévia interativa · sala/chat demonstrativos · upsells manuais |
| `/live/replays` | Lives gravadas | Catálogo com acesso aberto/Premium e player para YouTube, Vimeo ou vídeo HTTPS |
| `/live/premium` | Lobby Premium Live | Gate por assinatura demo |
| `/account` | Perfil | Login, compras e assinatura demonstrativos, salvos localmente |
| `/meu-plano` | Meu plano | Criar treinos e exercícios personalizados; adicionar, editar, reordenar e remover itens; acompanhar protocolos |
| `/trainer` | Host panel | Prévia visual; não transmite vídeo real |

## Catálogo de lives gravadas

Os replays são cadastrados no array `liveReplays` de `src/lib/replays.ts`. Cada item informa título, descrição, treinador, categoria, duração, data, `access` (`"free"` ou `"premium"`) e `playbackUrl`. O player reconhece links padrão do YouTube (inclusive não listado), Vimeo e arquivos HTTPS MP4/WebM/OGG; links HTTPS de outros serviços abrem na plataforma de origem.

O bloqueio Premium é apenas demonstrativo no GitHub Pages: como o app é estático e a assinatura é simulada no navegador, ele não protege links privados contra acesso direto. Para vender ou restringir gravações de verdade, integrar autenticação e uma plataforma que forneça autorização de playback segura (por exemplo, URLs assinadas).

**Bottom nav:** Início · Treinos · Meu plano · Live · Nutrição · Loja · Perfil

## O que ficou mais funcional (demo)

- Progresso persistido: exercícios concluídos por sessão de protocolo, roteiro semanal, dias de corrida, capítulos do ebook, VODs, itens da loja, premium, streak e adaptações salvas
- Meu plano: treinos e exercícios personalizados persistidos no localStorage
- Protocolos: nomes/séries/repetições/descanso/notas editáveis por exercício; itens podem ser reordenados, concluídos e removidos sem apagar a sessão
- Fast Trainer: countdown work/rest que completa workout → toast + streak
- Free Live: prévia, sem transmissão real; mensagens do chat são demonstrativas e ficam em `sessionStorage`
- Loja: botões demonstrativos; não processam pagamentos reais nesta versão estática
- Upsells Free Live → VOD / Premium mantidos
- Silhuetas SVG e ilustrações portadas de `trainer-preview` como componentes React

## Seed de dados

- Live free + live premium
- 6 VODs (R$ 14,90–29,90)
- Premium R$ 49,90/mês
- Protocolos Inter (8 sem) / Avançado (12 sem)
- Fast Quicky 15 min · 5 exercícios · 4 rounds
- Corrida 5k / 10k
- 4 adaptações · ebook 7 capítulos · 6 produtos loja

Fontes: `src/lib/data.ts`, `src/lib/content.ts`

## O que é demo vs. real

| Recurso | Status |
|---------|--------|
| UI / navegação / funil / módulos Treino+ | Real (Next.js App Router) |
| Auth | **Demo** — localStorage |
| Checkout VOD / Loja / Assinatura | **Demo** — altera somente estado local; sem cobrança |
| Live / player / chat | **Mock** — session chat, sem WebRTC |
| Fast timer | **Funcional** no client |
| Pagamentos reais | Não nesta versão estática; requer backend e confirmação Stripe no servidor |

## Integração futura: Stripe + Supabase

Stubs futuros em `src/lib/stripe*`, `_api_server_only/` e `src/lib/supabase/*` permanecem no repositório; não são chamados pela interface demo do GitHub Pages.

Os botões de VOD e Premium apenas simulam acesso local no navegador. A aplicação ignora `?paid=1` e `?subscribed=1`: parâmetros de URL não provam pagamento. Para vender de verdade, será necessário backend que valide sessão/evento Stripe (por exemplo, webhook assinado) antes de atualizar a propriedade ou assinatura.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- System fonts · Apple Fitness–like cards · mobile-first · silhuetas SVG

## GitHub Pages (static export)

This app can be statically exported for project Pages at
`https://saulopassos00.github.io/treino-plus-preview2/`.

`next.config.mjs` sets `output: 'export'`, `basePath` / `assetPrefix`
`/treino-plus-preview2`, and `images.unoptimized`.

**API routes:** Next static export cannot include `src/app/api/**`.
Server-only Stripe stubs live in `_api_server_only/` (moved out of `src/app`
for the Pages build). Demo UI uses localStorage modals and does not need them.
To run with real Stripe locally, move `_api_server_only` back to `src/app/api`
and remove or relax `output: 'export'`.

```bash
npm run build   # writes out/
```

Deploy: each push to `main` publishes the static files in the root of `saulopassos00/treino-plus-preview2` through GitHub Actions.
