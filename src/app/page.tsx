"use client";

import Link from "next/link";
import { useDemoStore, useHasMounted } from "@/lib/store";
import { getProtocolProgress } from "@/lib/protocol-progress";
import { formatWeekRange, getWeekDays, toLocalDateKey, WEEK_ACTIVITIES } from "@/lib/week";
import { IconChevron, IconPlay } from "@/components/Icons";
import { BodySilhouette } from "@/components/BodySilhouette";
import { BookMark, RouteIllust, AdaptColuna } from "@/components/Illustrations";

export default function HomePage() {
  const store = useDemoStore();
  const mounted = useHasMounted();
  const greeting = mounted && store.user?.name
    ? `Olá, ${store.user.name.split(" ")[0]}`
    : "Olá";
  const days = getWeekDays();
  const today = days.find((day) => day.dateKey === toLocalDateKey(new Date())) ?? days[0];
  const weeklyEntries = mounted ? store.weeklyRoutine : {};
  const plannedDays = days.filter((day) => weeklyEntries[day.dateKey]?.activityId).length;
  const completedDays = days.filter((day) => weeklyEntries[day.dateKey]?.activityId && weeklyEntries[day.dateKey]?.completed).length;
  const todayEntry = today ? weeklyEntries[today.dateKey] : undefined;
  const todayActivity = WEEK_ACTIVITIES.find((activity) => activity.id === todayEntry?.activityId);
  const runDone = mounted ? store.corridaDone.filter((key) => key.startsWith("5k:")).length : 0;
  const chapters = mounted ? store.ebookChaptersRead.length : 0;
  const activeProtocol = mounted && store.protocolStarted.inter
    ? { level: "inter" as const, label: "Intermediário", href: "/treinos/protocolo/inter" }
    : mounted && store.protocolStarted.avancado
      ? { level: "avancado" as const, label: "Avançado", href: "/treinos/protocolo/avancado" }
      : null;
  const protocolPct = activeProtocol ? getProtocolProgress(store, activeProtocol.level) : 0;

  return (
    <main className="space-y-6 pb-6 pt-2">
      <header className="flex items-end justify-between px-5 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#007AFF]">Treino Plus</p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight">{greeting}</h1>
          <p className="mt-1 text-sm text-neutral-500">Seu espaço para se movimentar no seu ritmo.</p>
        </div>
        <Link href="/account" className="rounded-full bg-neutral-900/5 px-3 py-2 text-xs font-semibold text-neutral-600">Perfil</Link>
      </header>

      <section className="mx-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#123C65] via-[#0876D9] to-[#48B7C9] p-5 text-white shadow-lg shadow-blue-900/10">
        <span className="inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">Treinos · lives · bem-estar</span>
        <h2 className="mt-4 max-w-sm text-[25px] font-bold leading-tight tracking-tight">Encontre um treino. Organize sua semana. Continue no seu ritmo.</h2>
        <p className="mt-2 max-w-sm text-sm text-white/85">Comece pelo que cabe no seu dia — e ajuste o plano quando quiser.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link href="/treinos" className="rounded-xl bg-white px-3 py-3 text-center text-sm font-bold text-[#123C65]">Escolher treino</Link>
          <Link href="/semana" className="rounded-xl bg-black/15 px-3 py-3 text-center text-sm font-bold text-white ring-1 ring-white/30">Montar minha semana</Link>
        </div>
      </section>

      <section className="mx-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/[0.05]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Minha semana · {formatWeekRange(days)}</p>
            <h2 className="mt-1 text-lg font-bold">{plannedDays ? `${completedDays} de ${plannedDays} dias concluídos` : "Seu roteiro começa com uma escolha"}</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {todayActivity ? `Hoje: ${todayActivity.label}${todayEntry?.completed ? " · concluído" : ""}` : "Escolha treinos, corrida, replays, nutrição ou descanso."}
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#007AFF]" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3m-3 3h7" strokeLinecap="round"/></svg>
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-label="Dias concluídos no roteiro semanal" aria-valuemin={0} aria-valuemax={plannedDays || 7} aria-valuenow={completedDays}>
          <div className="h-full rounded-full bg-[#007AFF] transition-all" style={{ width: `${plannedDays ? (completedDays / plannedDays) * 100 : 0}%` }} />
        </div>
        <Link href="/semana" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#007AFF]">Abrir roteiro semanal <IconChevron className="h-4 w-4" /></Link>
      </section>

      <section className="px-4">
        <div className="mb-3 flex items-end justify-between px-1">
          <div><h2 className="text-xl font-bold tracking-tight">Treinar hoje</h2><p className="text-xs text-neutral-500">Escolha a duração e o tipo de atividade.</p></div>
          <Link href="/treinos" className="text-xs font-semibold text-[#007AFF]">Ver todos</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/treinos/fast" className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] transition active:scale-[0.98]">
            <div className="tone-fast flex h-24 items-center justify-center"><BodySilhouette part="full" className="h-20 w-12" /></div>
            <div className="p-3"><strong className="block text-sm">Fast Trainer</strong><span className="mt-1 block text-xs text-neutral-500">15 min · sessão rápida</span></div>
          </Link>
          {activeProtocol ? (
            <Link href={activeProtocol.href} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] transition active:scale-[0.98]">
              <div className="tone-a flex h-24 items-center justify-center"><BodySilhouette part="peito" className="h-20 w-12" /></div>
              <div className="p-3"><strong className="block text-sm">Protocolo {activeProtocol.label}</strong><span className="mt-1 block text-xs text-neutral-500">{protocolPct}% dos exercícios concluídos</span></div>
            </Link>
          ) : (
            <Link href="/treinos/protocolo/inter" className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] transition active:scale-[0.98]">
              <div className="tone-a flex h-24 items-center justify-center"><BodySilhouette part="peito" className="h-20 w-12" /></div>
              <div className="p-3"><strong className="block text-sm">Protocolos</strong><span className="mt-1 block text-xs text-neutral-500">Escolha o seu nível</span></div>
            </Link>
          )}
          <Link href="/corrida/5k" className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] transition active:scale-[0.98]">
            <div className="tone-run5 flex h-24 items-center justify-center p-3"><RouteIllust className="h-12 w-20" /></div>
            <div className="p-3"><strong className="block text-sm">Corrida 0 → 5 km</strong><span className="mt-1 block text-xs text-neutral-500">{runDone ? `${runDone} dias marcados` : "Programa progressivo"}</span></div>
          </Link>
          <Link href="/live/replays" className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] transition active:scale-[0.98]">
            <div className="flex h-24 items-center justify-center bg-orange-50 text-orange-600"><IconPlay className="h-8 w-8" /></div>
            <div className="p-3"><strong className="block text-sm">Lives gravadas</strong><span className="mt-1 block text-xs text-neutral-500">Assista no seu ritmo</span></div>
          </Link>
        </div>
      </section>

      <section className="mx-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-900">i</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-950">Sala Live em demonstração</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-900">Veja como será a experiência; a transmissão, a audiência e o chat ainda não são ao vivo.</p>
          </div>
          <Link href="/live/free" className="shrink-0 rounded-full bg-white px-3 py-2 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">Ver prévia</Link>
        </div>
      </section>

      <section className="px-4">
        <h2 className="mb-3 px-1 text-xl font-bold tracking-tight">Planejar e aprender</h2>
        <div className="space-y-3">
          <Link href="/nutricao" className="flex overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
            <div className="flex w-24 shrink-0 items-center justify-center bg-emerald-50 text-emerald-700"><span className="text-3xl" aria-hidden="true">✳</span></div>
            <div className="flex-1 p-4"><span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Nutrição</span><strong className="mt-1 block text-[15px]">Organize suas refeições</strong><p className="mt-1 text-xs text-neutral-500">Dicas e planejador semanal · conteúdo educativo</p></div>
            <IconChevron className="mr-3 mt-6 h-4 w-4 shrink-0 text-neutral-300" />
          </Link>
          <Link href="/meu-plano" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-[#007AFF]" aria-hidden="true">＋</span>
            <span className="min-w-0 flex-1"><strong className="block text-sm">Meu plano</strong><span className="mt-0.5 block text-xs text-neutral-500">Crie treinos e personalize exercícios</span></span>
            <IconChevron className="h-4 w-4 text-neutral-300" />
          </Link>
          <Link href="/historico" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl font-bold text-emerald-700" aria-hidden="true">↗</span>
            <span className="min-w-0 flex-1"><strong className="block text-sm">Histórico e evolução</strong><span className="mt-0.5 block text-xs text-neutral-500">Registre cargas, acompanhe marcas e desafios</span></span>
            <IconChevron className="h-4 w-4 text-neutral-300" />
          </Link>
          <Link href="/ebook" className="flex overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
            <div className="flex w-24 shrink-0 items-center justify-center" style={{ background: "linear-gradient(165deg,#1A3A2A,#52B788)" }}><BookMark className="h-14 w-11" /></div>
            <div className="flex-1 p-4"><span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Guia</span><strong className="mt-1 block text-[15px]">Ebook de nutrição</strong><p className="mt-1 text-xs text-neutral-500">Guia prático · {chapters}/7 capítulos lidos</p></div>
            <IconChevron className="mr-3 mt-6 h-4 w-4 shrink-0 text-neutral-300" />
          </Link>
        </div>
      </section>

      <section className="px-4">
        <h2 className="mb-3 px-1 text-xl font-bold tracking-tight">Explorar mais</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/adaptacoes" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]"><div className="mb-3 flex h-12 items-center justify-center rounded-xl bg-neutral-50"><AdaptColuna className="h-11 w-11" /></div><strong className="block text-sm">Adaptações</strong><span className="mt-1 block text-xs text-neutral-500">Joelho, coluna e mais</span></Link>
          <Link href="/library" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]"><div className="mb-3 flex h-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h6v12H4zm8-2h8v16h-8z" /></svg></div><strong className="block text-sm">Biblioteca VOD</strong><span className="mt-1 block text-xs text-neutral-500">Treinos gravados · prévia</span></Link>
          <Link href="/loja" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]"><div className="mb-3 flex h-12 items-center justify-center rounded-xl bg-orange-50 text-2xl text-orange-600" aria-hidden="true">▢</div><strong className="block text-sm">Loja</strong><span className="mt-1 block text-xs text-neutral-500">Catálogo demonstrativo</span></Link>
          <Link href="/corrida" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]"><div className="mb-3 flex h-12 items-center justify-center rounded-xl bg-lime-50"><RouteIllust className="h-9 w-14" /></div><strong className="block text-sm">Programas de corrida</strong><span className="mt-1 block text-xs text-neutral-500">Planos 5 km e 10 km</span></Link>
        </div>
      </section>
    </main>
  );
}
