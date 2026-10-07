"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Exercise, WorkoutItem } from "@/types";
import { useDemoStore, useHasMounted } from "@/lib/store";

const CATALOG: Exercise[] = [
  { id: "catalog-agachamento", name: "Agachamento", muscleGroup: "Pernas e glúteos", equipment: "Peso corporal ou barra", level: "Iniciante", isCustom: false, createdAt: "", updatedAt: "" },
  { id: "catalog-flexao", name: "Flexão de braço", muscleGroup: "Peito e tríceps", equipment: "Peso corporal", level: "Iniciante", createdAt: "", updatedAt: "", isCustom: false },
  { id: "catalog-remada", name: "Remada unilateral", muscleGroup: "Costas e bíceps", equipment: "Halter", level: "Intermediário", createdAt: "", updatedAt: "", isCustom: false },
  { id: "catalog-ponte", name: "Ponte de glúteos", muscleGroup: "Glúteos", equipment: "Peso corporal", level: "Iniciante", createdAt: "", updatedAt: "", isCustom: false },
  { id: "catalog-prancha", name: "Prancha", muscleGroup: "Core", equipment: "Peso corporal", level: "Iniciante", createdAt: "", updatedAt: "", isCustom: false },
  { id: "catalog-desenvolvimento", name: "Desenvolvimento de ombros", muscleGroup: "Ombros", equipment: "Halteres", level: "Intermediário", createdAt: "", updatedAt: "", isCustom: false },
  { id: "catalog-mobilidade-quadril", name: "Mobilidade de quadril", muscleGroup: "Mobilidade", equipment: "Sem equipamento", level: "Iniciante", createdAt: "", updatedAt: "", isCustom: false },
];

function exerciseForId(id: string, customExercises: Exercise[]): Exercise | undefined {
  return customExercises.find((exercise) => exercise.id === id) ?? CATALOG.find((exercise) => exercise.id === id);
}

export default function MeuPlanoPage() {
  const {
    customExercises,
    customWorkouts,
    createCustomExercise,
    updateCustomExercise,
    deleteCustomExercise,
    createCustomWorkout,
    updateCustomWorkout,
    deleteCustomWorkout,
    addWorkoutItem,
    updateWorkoutItem,
    removeWorkoutItem,
    reorderWorkoutItems,
  } = useDemoStore();
  const mounted = useHasMounted();
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [workoutGoal, setWorkoutGoal] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseGroup, setExerciseGroup] = useState("");
  const [exerciseEquipment, setExerciseEquipment] = useState("");
  const [exerciseLevel, setExerciseLevel] = useState<Exercise["level"]>("Iniciante");
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState<Record<string, string>>({});
  const allExercises = useMemo(() => [...CATALOG, ...customExercises], [customExercises]);

  function handleCreateWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createCustomWorkout(workoutTitle, workoutGoal)) return;
    setWorkoutTitle("");
    setWorkoutGoal("");
    setShowWorkoutForm(false);
  }

  function handleSaveExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingExerciseId) {
      updateCustomExercise(editingExerciseId, {
        name: exerciseName,
        muscleGroup: exerciseGroup,
        equipment: exerciseEquipment,
        level: exerciseLevel,
      });
    } else {
      createCustomExercise({
        name: exerciseName,
        muscleGroup: exerciseGroup,
        equipment: exerciseEquipment,
        level: exerciseLevel,
      });
    }
    setExerciseName("");
    setExerciseGroup("");
    setExerciseEquipment("");
    setExerciseLevel("Iniciante");
    setEditingExerciseId(null);
  }

  function beginEditExercise(exercise: Exercise) {
    setEditingExerciseId(exercise.id);
    setExerciseName(exercise.name);
    setExerciseGroup(exercise.muscleGroup);
    setExerciseEquipment(exercise.equipment ?? "");
    setExerciseLevel(exercise.level);
  }

  function moveItem(workoutId: string, items: WorkoutItem[], index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    reorderWorkoutItems(workoutId, reordered.map((item) => item.id));
  }

  return (
    <main className="px-4 pb-8 pt-5">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#007AFF]">Seu espaço</p>
        <h1 className="mt-1 text-[32px] font-bold tracking-tight">Meu plano</h1>
        <p className="mt-1 text-sm text-neutral-500">Monte treinos do seu jeito e mantenha tudo organizado.</p>
      </header>

      <section className="mb-5 rounded-3xl bg-gradient-to-br from-[#123C65] to-[#007AFF] p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/75">Organize sua rotina</p>
            <h2 className="mt-1 text-xl font-bold">Um treino por vez</h2>
            <p className="mt-2 max-w-[18rem] text-sm text-white/80">Crie uma sessão e adicione exercícios da biblioteca ou seus próprios movimentos.</p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl" aria-hidden="true">＋</span>
        </div>
        <button
          type="button"
          onClick={() => setShowWorkoutForm((shown) => !shown)}
          className="mt-4 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#123C65]"
        >
          {showWorkoutForm ? "Fechar" : "+ Criar treino"}
        </button>
      </section>

      {showWorkoutForm && (
        <form onSubmit={handleCreateWorkout} className="mb-5 space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <h2 className="font-semibold">Novo treino</h2>
          <label className="block text-sm font-medium">
            Nome do treino
            <input required maxLength={60} value={workoutTitle} onChange={(event) => setWorkoutTitle(event.target.value)} placeholder="Ex.: Treino de segunda" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-3 text-base outline-none focus:ring-2 focus:ring-[#007AFF]" />
          </label>
          <label className="block text-sm font-medium">
            Objetivo <span className="font-normal text-neutral-400">(opcional)</span>
            <input maxLength={100} value={workoutGoal} onChange={(event) => setWorkoutGoal(event.target.value)} placeholder="Ex.: força e mobilidade" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-3 text-base outline-none focus:ring-2 focus:ring-[#007AFF]" />
          </label>
          <button className="w-full rounded-xl bg-[#007AFF] py-3 font-semibold text-white">Criar treino</button>
        </form>
      )}

      <section className="mb-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <div className="mb-3">
          <h2 className="font-semibold">Seus exercícios</h2>
          <p className="mt-0.5 text-xs text-neutral-500">Cadastre movimentos que não encontrou na biblioteca.</p>
        </div>
        <form onSubmit={handleSaveExercise} className="space-y-2.5">
          <label className="sr-only" htmlFor="custom-exercise-name">Nome do exercício</label>
          <input id="custom-exercise-name" required maxLength={60} value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} placeholder="Nome do exercício" className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#007AFF]" />
          <div className="grid grid-cols-2 gap-2">
            <input required maxLength={40} value={exerciseGroup} onChange={(event) => setExerciseGroup(event.target.value)} placeholder="Grupo muscular" className="min-w-0 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#007AFF]" />
            <input maxLength={40} value={exerciseEquipment} onChange={(event) => setExerciseEquipment(event.target.value)} placeholder="Equipamento (opcional)" className="min-w-0 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#007AFF]" />
          </div>
          <div className="flex gap-2">
            <select value={exerciseLevel} onChange={(event) => setExerciseLevel(event.target.value as Exercise["level"])} className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm">
              <option>Iniciante</option><option>Intermediário</option><option>Avançado</option>
            </select>
            <button className="shrink-0 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white">{editingExerciseId ? "Salvar edição" : "＋ Criar exercício"}</button>
          </div>
          {editingExerciseId && <button type="button" onClick={() => { setEditingExerciseId(null); setExerciseName(""); setExerciseGroup(""); setExerciseEquipment(""); }} className="text-xs font-medium text-neutral-500">Cancelar edição</button>}
        </form>
        {mounted && customExercises.length > 0 && (
          <ul className="mt-4 divide-y divide-neutral-100">
            {customExercises.map((exercise) => (
              <li key={exercise.id} className="flex items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{exercise.name}</p><p className="text-xs text-neutral-500">{exercise.muscleGroup}{exercise.equipment ? ` · ${exercise.equipment}` : ""}</p></div>
                <button type="button" onClick={() => beginEditExercise(exercise)} className="rounded-lg px-2 py-1 text-xs font-medium text-[#007AFF]">Editar</button>
                <button type="button" onClick={() => { if (window.confirm(`Excluir “${exercise.name}”? Ele também será removido dos treinos em que aparece.`)) deleteCustomExercise(exercise.id); }} className="rounded-lg px-2 py-1 text-xs font-medium text-red-600">Excluir</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <div><h2 className="text-xl font-bold">Treinos criados</h2><p className="text-xs text-neutral-500">{mounted ? `${customWorkouts.length} ${customWorkouts.length === 1 ? "treino" : "treinos"}` : ""}</p></div>
          <button type="button" onClick={() => setShowWorkoutForm(true)} className="text-sm font-semibold text-[#007AFF]">+ Novo</button>
        </div>

        {mounted && customWorkouts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-[#007AFF]" aria-hidden="true">＋</div>
            <h3 className="mt-3 font-semibold">Seu primeiro treino começa aqui</h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-neutral-500">Crie um treino, escolha os exercícios e ajuste séries e repetições.</p>
            <button type="button" onClick={() => setShowWorkoutForm(true)} className="mt-4 rounded-xl bg-[#007AFF] px-4 py-2.5 text-sm font-semibold text-white">Criar meu primeiro treino</button>
          </div>
        ) : (
          <div className="space-y-3">
            {mounted && customWorkouts.map((workout) => {
              const query = exerciseSearch[workout.id] ?? "";
              const options = allExercises.filter((exercise) =>
                `${exercise.name} ${exercise.muscleGroup} ${exercise.equipment ?? ""}`.toLowerCase().includes(query.toLowerCase())
              );
              return (
                <article key={workout.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/[0.04]">
                  <header className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <input aria-label="Nome do treino" maxLength={60} value={workout.title} onChange={(event) => updateCustomWorkout(workout.id, { title: event.target.value })} onBlur={(event) => updateCustomWorkout(workout.id, { title: event.target.value })} className="w-full truncate bg-transparent text-lg font-bold outline-none focus:ring-2 focus:ring-blue-100" />
                      <p className="mt-0.5 text-xs text-neutral-500">{workout.goal || "Toque no nome para editar"} · {workout.items.length} {workout.items.length === 1 ? "exercício" : "exercícios"}</p>
                    </div>
                    <button type="button" onClick={() => { if (window.confirm(`Excluir o treino “${workout.title}”?`)) deleteCustomWorkout(workout.id); }} aria-label={`Excluir ${workout.title}`} className="rounded-lg px-2 py-1 text-xs font-medium text-red-600">Excluir</button>
                  </header>

                  {workout.items.length > 0 ? (
                    <ol className="divide-y divide-neutral-100 border-t border-neutral-100 px-4">
                      {[...workout.items].sort((a, b) => a.order - b.order).map((item, index, items) => {
                        const exercise = exerciseForId(item.exerciseId, customExercises);
                        return (
                          <li key={item.id} className="flex items-center gap-2 py-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-[#007AFF]">{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{exercise?.name ?? "Exercício removido"}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-neutral-500">
                                <label>Séries <input aria-label={`Séries de ${exercise?.name ?? "exercício"}`} type="number" min="1" max="20" value={item.sets ?? 3} onChange={(event) => updateWorkoutItem(workout.id, item.id, { sets: Number(event.target.value) || 1 })} className="w-10 rounded-md bg-neutral-100 px-1 py-0.5 text-center text-neutral-800" /></label>
                                <span>×</span>
                                <label>Reps <input aria-label={`Repetições de ${exercise?.name ?? "exercício"}`} type="number" min="1" max="100" value={item.reps ?? 10} onChange={(event) => updateWorkoutItem(workout.id, item.id, { reps: Number(event.target.value) || 1 })} className="w-10 rounded-md bg-neutral-100 px-1 py-0.5 text-center text-neutral-800" /></label>
                                <label>Descanso <input aria-label={`Descanso de ${exercise?.name ?? "exercício"}`} type="number" min="0" max="600" step="15" value={item.restSec ?? 60} onChange={(event) => updateWorkoutItem(workout.id, item.id, { restSec: Number(event.target.value) || 0 })} className="w-12 rounded-md bg-neutral-100 px-1 py-0.5 text-center text-neutral-800" /> s</label>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col">
                              <button type="button" disabled={index === 0} onClick={() => moveItem(workout.id, items, index, -1)} aria-label="Mover para cima" className="px-1 text-neutral-500 disabled:opacity-25">↑</button>
                              <button type="button" disabled={index === items.length - 1} onClick={() => moveItem(workout.id, items, index, 1)} aria-label="Mover para baixo" className="px-1 text-neutral-500 disabled:opacity-25">↓</button>
                            </div>
                            <button type="button" onClick={() => removeWorkoutItem(workout.id, item.id)} aria-label={`Remover ${exercise?.name ?? "exercício"}`} className="px-1 text-lg text-neutral-400">×</button>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="border-t border-neutral-100 px-4 py-3 text-sm text-neutral-500">Ainda sem exercícios. Adicione o primeiro abaixo.</p>
                  )}

                  <div className="border-t border-neutral-100 bg-neutral-50/70 p-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500" htmlFor={`exercise-search-${workout.id}`}>Adicionar exercício</label>
                    <input id={`exercise-search-${workout.id}`} value={query} onChange={(event) => setExerciseSearch((current) => ({ ...current, [workout.id]: event.target.value }))} placeholder="Buscar por exercício ou grupo muscular" className="mb-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#007AFF]" />
                    <ul className="max-h-52 divide-y divide-neutral-200 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
                      {options.map((exercise) => (
                        <li key={exercise.id} className="flex items-center gap-2 px-3 py-2.5">
                          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{exercise.name}</p><p className="text-[11px] text-neutral-500">{exercise.muscleGroup}{exercise.isCustom ? " · personalizado" : ""}</p></div>
                          <button type="button" onClick={() => addWorkoutItem(workout.id, exercise.id, { sets: 3, reps: 10, restSec: 60 })} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#007AFF]">+ Adicionar</button>
                        </li>
                      ))}
                      {options.length === 0 && <li className="px-3 py-3 text-center text-xs text-neutral-500">Nenhum exercício encontrado.</li>}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
