"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { BackNav } from "@/components/BackNav";
import { SessionCard } from "@/components/SessionCard";
import { SilhouetteCollage } from "@/components/BodySilhouette";
import { PROTO_ADV_BLOCKS, PROTO_INTER_SESSIONS } from "@/lib/content";
import { getProtocolProgress } from "@/lib/protocol-progress";
import { useDemoStore, useHasMounted } from "@/lib/store";
import { useToast } from "@/components/Toast";
import type { ProtocolExercise, ProtocolLevel } from "@/types";

const EMPTY_DRAFT = { name: "", sets: "", reps: "", restSec: "", notes: "" };

function ExerciseRow({
  exercise,
  index,
  total,
  completed,
  onUpdate,
  onRemove,
  onMove,
  onToggleDone,
}: {
  exercise: ProtocolExercise;
  index: number;
  total: number;
  completed: boolean;
  onUpdate: (updates: Partial<Omit<ProtocolExercise, "id" | "order">>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onToggleDone: () => void;
}) {
  const [name, setName] = useState(exercise.name);
  const [sets, setSets] = useState(exercise.sets?.toString() ?? "");
  const [reps, setReps] = useState(exercise.reps ?? "");
  const [restSec, setRestSec] = useState(exercise.restSec?.toString() ?? "");
  const [notes, setNotes] = useState(exercise.notes ?? "");

  function save() {
    onUpdate({
      name: name.trim() || exercise.name,
      sets: sets ? Number(sets) : undefined,
      reps: reps.trim() || undefined,
      restSec: restSec ? Number(restSec) : undefined,
      notes: notes.trim() || undefined,
    });
  }

  const inputClass = "min-w-0 rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-[#007AFF]";

  return (
    <li className={`rounded-2xl border p-3 ${completed ? "border-emerald-200 bg-emerald-50/50" : "border-neutral-100 bg-neutral-50/70"}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleDone}
          aria-pressed={completed}
          aria-label={completed ? `Desmarcar ${exercise.name} como concluído` : `Marcar ${exercise.name} como concluído`}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${completed ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 bg-white text-transparent"}`}
        >✓</button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Nome do exercício</span>
          <input value={name} onChange={(event) => setName(event.target.value)} onBlur={save} maxLength={80} className={`${inputClass} w-full font-semibold ${completed ? "text-neutral-500 line-through" : ""}`} />
        </label>
        <div className="flex shrink-0 flex-col">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Mover ${exercise.name} para cima`} className="px-2 text-neutral-600 disabled:opacity-25">↑</button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} aria-label={`Mover ${exercise.name} para baixo`} className="px-2 text-neutral-600 disabled:opacity-25">↓</button>
        </div>
        <button type="button" onClick={onRemove} aria-label={`Remover ${exercise.name} do treino`} className="rounded-lg px-2 py-1 text-lg leading-none text-red-600">×</button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 pl-9">
        <label className="text-[10px] font-medium text-neutral-500">Séries
          <input type="number" min="1" max="30" inputMode="numeric" value={sets} onChange={(event) => setSets(event.target.value)} onBlur={save} placeholder="—" className={`${inputClass} mt-1 w-full text-center`} />
        </label>
        <label className="text-[10px] font-medium text-neutral-500">Reps / tempo
          <input value={reps} onChange={(event) => setReps(event.target.value)} onBlur={save} maxLength={24} placeholder="Ex.: 8–10" className={`${inputClass} mt-1 w-full text-center`} />
        </label>
        <label className="text-[10px] font-medium text-neutral-500">Descanso (s)
          <input type="number" min="0" max="900" step="5" inputMode="numeric" value={restSec} onChange={(event) => setRestSec(event.target.value)} onBlur={save} placeholder="—" className={`${inputClass} mt-1 w-full text-center`} />
        </label>
      </div>
      <label className="mt-2 block pl-9 text-[10px] font-medium text-neutral-500">Observação (opcional)
        <input value={notes} onChange={(event) => setNotes(event.target.value)} onBlur={save} maxLength={120} placeholder="Anotação para este exercício" className={`${inputClass} mt-1 w-full`} />
      </label>
    </li>
  );
}

export default function ProtocoloPage() {
  const params = useParams();
  const level = (params.level === "avancado" ? "avancado" : "inter") as ProtocolLevel;
  const isInter = level === "inter";
  const store = useDemoStore();
  const mounted = useHasMounted();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, typeof EMPTY_DRAFT>>({});
  const pct = mounted ? getProtocolProgress(store, level) : 0;
  const inMyPlan = mounted && store.protocolStarted[level];
  const allSessions = isInter ? PROTO_INTER_SESSIONS : PROTO_ADV_BLOCKS;
  const removedSessions = mounted ? store.protocolRemovedSessions[level] : [];
  const sessions = allSessions.filter((session) => !removedSessions.includes(session.title));
  const exerciseCount = useMemo(
    () => sessions.reduce((sum, session) => sum + (store.protocolOverrides[level][session.id]?.length ?? 0), 0),
    [sessions, store.protocolOverrides, level]
  );

  function draftFor(sessionId: string) {
    return drafts[sessionId] ?? EMPTY_DRAFT;
  }

  function setDraft(sessionId: string, patch: Partial<typeof EMPTY_DRAFT>) {
    setDrafts((current) => ({
      ...current,
      [sessionId]: { ...(current[sessionId] ?? EMPTY_DRAFT), ...patch },
    }));
  }

  function addExercise(sessionId: string) {
    const draft = draftFor(sessionId);
    const id = store.addProtocolExercise(level, sessionId, {
      name: draft.name,
      sets: draft.sets ? Number(draft.sets) : undefined,
      reps: draft.reps,
      restSec: draft.restSec ? Number(draft.restSec) : undefined,
      notes: draft.notes,
    });
    if (!id) {
      toast("Informe o nome do exercício para adicioná-lo.");
      return;
    }
    setDraft(sessionId, EMPTY_DRAFT);
    setExpanded((current) => ({ ...current, [sessionId]: true }));
    toast("Exercício adicionado. Suas alterações ficam salvas neste navegador.");
  }

  function moveExercise(sessionId: string, items: ProtocolExercise[], index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    store.reorderProtocolExercises(level, sessionId, next.map((item) => item.id));
  }

  return (
    <main className="pb-6 pt-2">
      <BackNav href="/treinos" label="Treinos" title="Protocolo" />

      <div className="mx-4 mt-2 overflow-hidden rounded-[14px] bg-white shadow-sm ring-1 ring-black/[0.04]">
        <div className={`relative min-h-[132px] p-5 text-white ${isInter ? "bg-gradient-to-br from-[#1C3A5F] to-[#007AFF]" : "bg-gradient-to-br from-[#2C1F4A] to-[#5856D6]"}`}>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">{isInter ? "Nível 2" : "Nível 3"}</span>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/75">{isInter ? "8 semanas · hipertrofia" : "12 semanas · periodização"}</p>
          <h3 className="text-[22px] font-bold">{isInter ? "Intermediário" : "Avançado"}</h3>
          <div className="absolute bottom-2 right-2"><SilhouetteCollage parts={isInter ? ["peito", "costas", "pernas"] : ["ombros", "costas", "gluteo"]} /></div>
        </div>
        <div className="flex flex-wrap gap-2 p-3">
          <span className="rounded-full bg-[#007AFF]/12 px-2.5 py-1 text-xs font-semibold text-[#007AFF]">{isInter ? "4× / semana" : "5–6× / semana"}</span>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium">{isInter ? "45–60 min" : "60–75 min"}</span>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium">{isInter ? "Progressão linear" : "PPL · RPE"}</span>
        </div>
      </div>

      <p className="px-5 pt-3 text-sm text-neutral-500">{isInter ? "Divisão ABC + full body. Para quem já treina há 6 meses ou mais." : "Para atletas experientes. Mesociclos de volume, intensidade e deload."}</p>

      <section className="mx-4 mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-relaxed text-blue-950">
        Os nomes e a prescrição dos exercícios devem refletir seu protocolo real. Cadastre-os nesta tela; não preenchemos movimentos automaticamente porque a ficha original não continha essa lista. As alterações ficam salvas neste navegador.
      </section>

      <div className="mx-5 mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-xs text-neutral-500">Progresso pelo que você marcou</p><p className="mt-0.5 text-xl font-bold">{pct}%</p></div>
          <p className="text-right text-xs text-neutral-500">{exerciseCount} {exerciseCount === 1 ? "exercício cadastrado" : "exercícios cadastrados"}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-label="Progresso dos exercícios concluídos" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><div className="h-full rounded-full bg-[#007AFF] transition-all" style={{ width: `${pct}%` }} /></div>
      </div>

      <p className="px-5 pb-3 pt-5 text-xl font-bold">{isInter ? "Sessões da semana" : "Blocos do protocolo"}</p>
      <div className="space-y-3 px-4">
        {sessions.length > 0 ? sessions.map((session) => {
          const items = [...(store.protocolOverrides[level][session.id] ?? [])].sort((a, b) => a.order - b.order);
          const doneIds = store.protocolCompletedExerciseIds[level][session.id] ?? [];
          const isExpanded = expanded[session.id] ?? false;
          const sessionTitle = isInter ? session.title : `${session.title} · exercícios`;
          return (
            <section key={session.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
              <div className="flex items-start gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <SessionCard part={session.part} title={session.title} caption={`${items.length} ${items.length === 1 ? "exercício cadastrado" : "exercícios cadastrados"} · ${session.caption}`} tag={session.tag || undefined} />
                </div>
                <button type="button" onClick={() => setExpanded((current) => ({ ...current, [session.id]: !isExpanded }))} aria-expanded={isExpanded} className="mt-2 shrink-0 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-[#007AFF]">{isExpanded ? "Fechar" : "Editar"}</button>
                <button type="button" onClick={() => { store.removeProtocolSession(level, session.title); toast(`${session.title} removido. Você pode restaurar as sessões padrão.`); }} aria-label={`Remover a sessão ${session.title} do protocolo`} className="mt-2 shrink-0 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">Sessão ×</button>
              </div>

              {isExpanded ? (
                <div className="border-t border-neutral-100 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Exercícios de {sessionTitle}</h3>
                    <span className="text-[11px] text-neutral-500">{doneIds.filter((id) => items.some((item) => item.id === id)).length}/{items.length} feitos</span>
                  </div>

                  {items.length > 0 ? (
                    <ol className="space-y-2">
                      {items.map((exercise, index) => (
                        <ExerciseRow
                          key={exercise.id}
                          exercise={exercise}
                          index={index}
                          total={items.length}
                          completed={doneIds.includes(exercise.id)}
                          onUpdate={(updates) => store.updateProtocolExercise(level, session.id, exercise.id, updates)}
                          onToggleDone={() => {
                            const completed = store.toggleProtocolExerciseCompleted(level, session.id, exercise.id);
                            toast(completed ? "Exercício marcado como concluído." : "Conclusão desmarcada.");
                          }}
                          onMove={(direction) => moveExercise(session.id, items, index, direction)}
                          onRemove={() => {
                            if (window.confirm(`Remover “${exercise.name}” desta sessão?`)) {
                              store.removeProtocolExercise(level, session.id, exercise.id);
                              toast("Exercício removido. A sessão foi mantida.");
                            }
                          }}
                        />
                      ))}
                    </ol>
                  ) : (
                    <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center">
                      <p className="text-sm font-semibold">Nenhum exercício individual cadastrado</p>
                      <p className="mt-1 text-xs text-neutral-500">Adicione abaixo os movimentos reais da sua ficha. Você poderá editar, reordenar, concluir ou remover cada um separadamente.</p>
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl bg-neutral-50 p-3">
                    <h4 className="text-sm font-semibold">＋ Adicionar exercício</h4>
                    <div className="mt-2 space-y-2">
                      <label className="block text-xs font-medium text-neutral-600">Nome do exercício
                        <input value={draftFor(session.id).name} onChange={(event) => setDraft(session.id, { name: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addExercise(session.id); } }} maxLength={80} placeholder="Ex.: nome conforme sua ficha" className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007AFF]" />
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="text-[10px] font-medium text-neutral-500">Séries
                          <input type="number" min="1" max="30" value={draftFor(session.id).sets} onChange={(event) => setDraft(session.id, { sets: event.target.value })} placeholder="—" className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2.5 text-sm" />
                        </label>
                        <label className="text-[10px] font-medium text-neutral-500">Reps / tempo
                          <input value={draftFor(session.id).reps} onChange={(event) => setDraft(session.id, { reps: event.target.value })} maxLength={24} placeholder="8–10" className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2.5 text-sm" />
                        </label>
                        <label className="text-[10px] font-medium text-neutral-500">Descanso (s)
                          <input type="number" min="0" max="900" step="5" value={draftFor(session.id).restSec} onChange={(event) => setDraft(session.id, { restSec: event.target.value })} placeholder="—" className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2.5 text-sm" />
                        </label>
                      </div>
                      <label className="block text-xs font-medium text-neutral-600">Observação (opcional)
                        <input value={draftFor(session.id).notes} onChange={(event) => setDraft(session.id, { notes: event.target.value })} maxLength={120} placeholder="Anotação pessoal" className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm" />
                      </label>
                      <button type="button" onClick={() => addExercise(session.id)} className="w-full rounded-xl bg-[#007AFF] py-3 text-sm font-semibold text-white">Adicionar à sessão</button>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          );
        }) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-center">
            <p className="text-sm font-semibold">Você removeu todas as sessões desta lista.</p>
            <p className="mt-1 text-xs text-neutral-500">Restaure a lista padrão se quiser adicioná-las novamente.</p>
          </div>
        )}
        {mounted && removedSessions.length > 0 ? (
          <button type="button" onClick={() => { store.restoreProtocolSessions(level); toast("Sessões padrão restauradas."); }} className="w-full rounded-xl bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-700">Restaurar sessões removidas ({removedSessions.length})</button>
        ) : null}
      </div>

      <div className="space-y-2 px-4 pt-4">
        <button type="button" onClick={() => { store.startProtocol(level); toast("Protocolo aberto. Marque cada exercício como concluído quando terminar."); }} className="w-full rounded-2xl bg-[#007AFF] py-3.5 text-[15px] font-semibold text-white">{pct > 0 ? "Continuar protocolo" : "Começar protocolo"}</button>
        <button type="button" onClick={() => { const added = store.toggleProtocolInPlan(level); toast(added ? `${isInter ? "Intermediário" : "Avançado"} adicionado ao Meu plano` : "Protocolo removido do Meu plano. Seu progresso por exercício foi preservado."); }} disabled={!mounted} className={`w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-50 ${inMyPlan ? "bg-neutral-100 text-neutral-700" : "bg-blue-50 text-[#007AFF]"}`}>{inMyPlan ? "Remover do Meu plano" : "Adicionar ao Meu plano"}</button>
        <p className="px-2 text-center text-xs text-neutral-500">Abrir ou editar um exercício não altera o progresso. Ele só muda quando você marca ou desmarca o item.</p>
      </div>
    </main>
  );
}
