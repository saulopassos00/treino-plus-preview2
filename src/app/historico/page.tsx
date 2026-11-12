"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useDemoStore, useHasMounted } from "@/lib/store";
import { getWeekDays, toLocalDateKey } from "@/lib/week";

type DraftExercise = { id: number; name: string; sets: string; reps: string; loadKg: string };
const emptyExercise = (id: number): DraftExercise => ({ id, name: "", sets: "3", reps: "10", loadKg: "" });

export default function HistoryPage() {
  const { workoutHistory, logTrainingSession } = useDemoStore();
  const mounted = useHasMounted();
  const [title, setTitle] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([emptyExercise(1)]);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [notice, setNotice] = useState("");
  const days = getWeekDays();
  const weekStart = days[0]?.dateKey;
  const weekEnd = days[6]?.dateKey;
  const sessionsThisWeek = mounted ? workoutHistory.filter((entry) => {
    const key = toLocalDateKey(new Date(entry.date));
    return key >= weekStart && key <= weekEnd;
  }).length : 0;

  const bests = useMemo(() => {
    const byName = new Map<string, { loadKg: number; date: string }>();
    workoutHistory.forEach((session) => session.exercises.forEach((exercise) => {
      if (typeof exercise.loadKg !== "number" || exercise.loadKg <= 0) return;
      const key = exercise.name.trim().toLocaleLowerCase("pt-BR");
      const existing = byName.get(key);
      if (!existing || exercise.loadKg > existing.loadKg) {
        byName.set(key, { loadKg: exercise.loadKg, date: session.date });
      }
    }));
    return Array.from(byName.entries()).map(([key, value]) => ({
      name: workoutHistory.flatMap((session) => session.exercises).find((exercise) => exercise.name.trim().toLocaleLowerCase("pt-BR") === key)?.name ?? key,
      ...value,
    })).sort((a, b) => b.loadKg - a.loadKg);
  }, [workoutHistory]);
  const activeExerciseName = selectedExercise || bests[0]?.name || "";
  const progression = useMemo(() => workoutHistory
    .flatMap((session) => session.exercises
      .filter((exercise) => exercise.name.toLocaleLowerCase("pt-BR") === activeExerciseName.toLocaleLowerCase("pt-BR") && typeof exercise.loadKg === "number" && exercise.loadKg > 0)
      .map((exercise) => ({ date: session.date, loadKg: exercise.loadKg as number })))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-8), [workoutHistory, activeExerciseName]);
  const progressionMax = Math.max(1, ...progression.map((point) => point.loadKg));

  function updateExercise(id: number, patch: Partial<DraftExercise>) {
    setExercises((current) => current.map((exercise) => exercise.id === id ? { ...exercise, ...patch } : exercise));
  }

  function saveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validExercises = exercises.filter((exercise) => exercise.name.trim()).map((exercise) => ({
      id: `manual-${exercise.id}`,
      name: exercise.name.trim(),
      sets: exercise.sets ? Number(exercise.sets) : undefined,
      reps: exercise.reps.trim() || undefined,
      loadKg: exercise.loadKg ? Number(exercise.loadKg) : undefined,
    }));
    if (!validExercises.length) {
      setNotice("Adicione pelo menos um exercício para salvar a sessão.");
      return;
    }
    const id = logTrainingSession({ title, source: "manual", exercises: validExercises });
    if (!id) return;
    setTitle("");
    setExercises([emptyExercise(Date.now())]);
    setNotice("Treino registrado no histórico deste navegador.");
  }

  const badges = [
    { title: "Primeiro treino", description: "Registre sua primeira sessão.", unlocked: workoutHistory.length >= 1, progress: Math.min(workoutHistory.length, 1), goal: 1 },
    { title: "Cinco sessões", description: "Acumule cinco treinos registrados.", unlocked: workoutHistory.length >= 5, progress: Math.min(workoutHistory.length, 5), goal: 5 },
    { title: "Primeira carga", description: "Registre uma carga em qualquer exercício.", unlocked: bests.length > 0, progress: bests.length > 0 ? 1 : 0, goal: 1 },
    { title: "Semana consistente", description: "Registre três sessões nesta semana.", unlocked: sessionsThisWeek >= 3, progress: Math.min(sessionsThisWeek, 3), goal: 3 },
  ];

  return (
    <main className="px-4 pb-8 pt-5">
      <Link href="/meu-plano" className="text-sm font-semibold text-[#007AFF]">← Meu plano</Link>
      <header className="mb-5 mt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#007AFF]">Seu progresso, no seu ritmo</p>
        <h1 className="mt-1 text-[32px] font-bold tracking-tight">Histórico e evolução</h1>
        <p className="mt-1 text-sm text-neutral-500">Registre cargas e sessões para acompanhar suas próprias marcas.</p>
      </header>

      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
        Seus registros ficam somente neste navegador. Eles não são sincronizados entre dispositivos e não substituem a orientação de um profissional.
      </div>

      <section className="mb-5 rounded-3xl bg-gradient-to-br from-[#123C65] to-[#007AFF] p-5 text-white">
        <p className="text-sm text-white/75">Resumo pessoal</p>
        <div className="mt-2 flex gap-8">
          <div><strong className="block text-3xl">{mounted ? workoutHistory.length : 0}</strong><span className="text-xs text-white/80">sessões registradas</span></div>
          <div><strong className="block text-3xl">{mounted ? sessionsThisWeek : 0}/3</strong><span className="text-xs text-white/80">meta semanal</span></div>
        </div>
      </section>

      <section className="mb-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <h2 className="text-lg font-bold">Registrar treino</h2>
        <p className="mt-1 text-xs text-neutral-500">Anote a carga usada. Use kg quando fizer sentido; deixe em branco para exercícios sem peso externo.</p>
        <form onSubmit={saveSession} className="mt-4 space-y-3">
          <label className="block text-sm font-medium">Nome da sessão
            <input required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Treino de pernas" className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm" />
          </label>
          {exercises.map((exercise, index) => (
            <fieldset key={exercise.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
              <legend className="px-1 text-xs font-semibold text-neutral-500">Exercício {index + 1}</legend>
              <input aria-label={`Nome do exercício ${index + 1}`} maxLength={80} value={exercise.name} onChange={(event) => updateExercise(exercise.id, { name: event.target.value })} placeholder="Nome do exercício" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm" />
              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="text-[11px] text-neutral-500">Séries<input type="number" min="1" max="30" value={exercise.sets} onChange={(event) => updateExercise(exercise.id, { sets: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm text-neutral-900" /></label>
                <label className="text-[11px] text-neutral-500">Reps<input maxLength={24} value={exercise.reps} onChange={(event) => updateExercise(exercise.id, { reps: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm text-neutral-900" /></label>
                <label className="text-[11px] text-neutral-500">Carga (kg)<input type="number" min="0" max="1000" step="0.5" inputMode="decimal" value={exercise.loadKg} onChange={(event) => updateExercise(exercise.id, { loadKg: event.target.value })} placeholder="—" className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm text-neutral-900" /></label>
              </div>
              {exercises.length > 1 && <button type="button" onClick={() => setExercises((current) => current.filter((item) => item.id !== exercise.id))} className="mt-2 text-xs font-medium text-red-600">Remover exercício</button>}
            </fieldset>
          ))}
          <button type="button" onClick={() => setExercises((current) => [...current, emptyExercise(Date.now())])} className="w-full rounded-xl bg-blue-50 py-2.5 text-sm font-semibold text-[#007AFF]">＋ Adicionar exercício</button>
          {notice && <p role="status" className="text-xs text-emerald-700">{notice}</p>}
          <button className="w-full rounded-xl bg-[#007AFF] py-3 text-sm font-semibold text-white">Salvar no histórico</button>
        </form>
      </section>

      <section className="mb-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <h2 className="text-lg font-bold">Cargas de referência</h2>
        <p className="mt-1 text-xs text-neutral-500">Maior carga registrada por exercício. Registre novas sessões para observar mudanças.</p>
        {mounted && bests.length ? <ul className="mt-3 divide-y divide-neutral-100">{bests.map((item) => <li key={item.name} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0 truncate text-sm font-medium">{item.name}</span><span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">{item.loadKg} kg</span></li>)}</ul> : <p className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-500">As cargas aparecerão aqui depois que você salvar seu primeiro registro com peso.</p>}
        {mounted && bests.length > 0 && <div className="mt-4 border-t border-neutral-100 pt-4">
          <label className="block text-xs font-medium text-neutral-600">Evolução de
            <select value={activeExerciseName} onChange={(event) => setSelectedExercise(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900">
              {bests.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          {progression.length > 0 ? <div className="mt-4 rounded-2xl bg-neutral-50 p-3" aria-label={`Gráfico de evolução de carga para ${activeExerciseName}`}>
            <div className="flex h-28 items-end gap-2 border-b border-neutral-300 px-1">
              {progression.map((point, index) => <div key={`${point.date}-${index}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${point.loadKg} kg · ${new Date(point.date).toLocaleDateString("pt-BR")}`}>
                <span className="text-[9px] font-semibold text-neutral-600">{point.loadKg}</span>
                <div className="w-full max-w-8 rounded-t-md bg-[#007AFF]" style={{ height: `${Math.max(12, point.loadKg / progressionMax * 78)}%` }} />
              </div>)}
            </div>
            <div className="mt-2 flex gap-2">{progression.map((point, index) => <span key={`${point.date}-date-${index}`} className="min-w-0 flex-1 truncate text-center text-[9px] text-neutral-500">{new Date(point.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>)}</div>
            <p className="mt-2 text-[10px] text-neutral-500">Cargas em kg, por sessão registrada. Compare apenas execuções feitas em condições semelhantes.</p>
          </div> : <p className="mt-3 text-xs text-neutral-500">Não há pontos suficientes para este exercício ainda.</p>}
        </div>}
      </section>

      <section className="mb-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <div className="flex items-end justify-between"><div><h2 className="text-lg font-bold">Desafios e conquistas</h2><p className="mt-1 text-xs text-neutral-500">Metas pessoais, sem competição ou cobrança.</p></div><span className="text-xs font-semibold text-[#007AFF]">{badges.filter((badge) => badge.unlocked).length}/{badges.length}</span></div>
        <ul className="mt-3 space-y-2">{badges.map((badge) => <li key={badge.title} className={`rounded-2xl border p-3 ${badge.unlocked ? "border-emerald-200 bg-emerald-50/60" : "border-neutral-100 bg-neutral-50"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{badge.unlocked ? "✓ " : "○ "}{badge.title}</p><p className="mt-0.5 text-xs text-neutral-500">{badge.description}</p></div><span className="text-xs font-bold text-neutral-600">{badge.progress}/{badge.goal}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(badge.progress / badge.goal) * 100}%` }} /></div></li>)}</ul>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <h2 className="text-lg font-bold">Sessões recentes</h2>
        {mounted && workoutHistory.length ? <ol className="mt-3 space-y-3">{workoutHistory.slice(0, 20).map((session) => <li key={session.id} className="rounded-2xl border border-neutral-100 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{session.title}</p><p className="mt-0.5 text-xs text-neutral-500">{new Date(session.date).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {session.exercises.length} exercícios</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-[#007AFF]">{session.source === "manual" ? "Manual" : session.source === "protocol" ? "Protocolo" : session.source === "fast" ? "Fast Trainer" : "Meu plano"}</span></div><ul className="mt-2 space-y-1">{session.exercises.map((exercise) => <li key={exercise.id} className="text-xs text-neutral-600">{exercise.name}{exercise.sets ? ` · ${exercise.sets} séries` : ""}{exercise.reps ? ` × ${exercise.reps}` : ""}{typeof exercise.loadKg === "number" ? ` · ${exercise.loadKg} kg` : ""}</li>)}</ul></li>)}</ol> : <p className="mt-3 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">Você ainda não registrou sessões. Comece pelo formulário acima.</p>}
      </section>
    </main>
  );
}
