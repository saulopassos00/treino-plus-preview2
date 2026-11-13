"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EXERCISE_CATALOG, EXERCISE_EQUIPMENT } from "@/lib/exercise-catalog";
import { createBrowserClient } from "@/lib/supabase/client";
import { useDemoStore } from "@/lib/store";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function ExerciseLibrary() {
  const { selectedExerciseIds, selectExercise, deselectExercise } = useDemoStore();
  const [query, setQuery] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("Todos os equipamentos");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [remoteSelectedExerciseIds, setRemoteSelectedExerciseIds] = useState<string[]>([]);
  const [busyExerciseId, setBusyExerciseId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const client = createBrowserClient();
    setSupabaseConfigured(Boolean(client));
    if (!client) return;

    let active = true;
    let currentUserId: string | null = null;
    const loadSelections = async (userId: string | null) => {
      if (!active) return;
      currentUserId = userId;
      setSupabaseUserId(userId);
      setRemoteSelectedExerciseIds([]);
      if (!userId) {
        setMessage("");
        return;
      }

      const { data, error } = await client
        .from("user_selected_exercises")
        .select("catalog_exercise_id")
        .eq("user_id", userId);
      if (!active || currentUserId !== userId) return;
      if (error) {
        setMessage("Sua conta está conectada, mas a tabela de exercícios ainda não está pronta. Não foi possível sincronizar esta conta; aplique a migration Supabase.");
        return;
      }
      setRemoteSelectedExerciseIds((data ?? [])
        .map((row) => row.catalog_exercise_id)
        .filter((id): id is string => typeof id === "string"));
    };

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage("Não foi possível recuperar a sessão Supabase; a biblioteca continua disponível no modo local.");
      void loadSelections(data.session?.user.id ?? null);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      void loadSelections(session?.user.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const groups = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    const filtered = EXERCISE_CATALOG.filter((exercise) => {
      const equipment = exercise.equipment ?? "Sem equipamento";
      if (equipmentFilter !== "Todos os equipamentos" && equipment !== equipmentFilter) return false;
      const searchable = normalize(`${exercise.name} ${exercise.muscleGroup} ${equipment} ${exercise.level}`);
      return !normalizedQuery || searchable.includes(normalizedQuery);
    });
    const byGroup = new Map<string, typeof filtered>();
    for (const exercise of filtered) {
      const entries = byGroup.get(exercise.muscleGroup) ?? [];
      entries.push(exercise);
      byGroup.set(exercise.muscleGroup, entries);
    }
    return Array.from(byGroup.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [equipmentFilter, query]);

  async function addExercise(exercise: (typeof EXERCISE_CATALOG)[number]) {
    if (busyExerciseId) return;
    const selected = supabaseUserId
      ? remoteSelectedExerciseIds.includes(exercise.id)
      : selectedExerciseIds.includes(exercise.id);
    if (selected) {
      setMessage(`${exercise.name} já está no seu Meu Plano.`);
      return;
    }

    setBusyExerciseId(exercise.id);
    const client = createBrowserClient();
    if (client && supabaseUserId) {
      const { error } = await client.from("user_selected_exercises").upsert({
        user_id: supabaseUserId,
        catalog_exercise_id: exercise.id,
        exercise_name: exercise.name,
        muscle_group: exercise.muscleGroup,
        equipment: exercise.equipment ?? "Sem equipamento",
        level: exercise.level,
        sets: 3,
        reps: "10",
        rest_sec: 60,
        notes: "",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,catalog_exercise_id" });

      if (error) {
        setMessage(`${exercise.name} não foi salvo na conta. Confira a migration e tente novamente; a seleção não foi alterada.`);
        setBusyExerciseId(null);
        return;
      }
      setRemoteSelectedExerciseIds((current) => Array.from(new Set([...current, exercise.id])));
      setMessage(`${exercise.name} foi salvo na sua conta. Você pode incluí-lo em uma sessão pelo Meu Plano.`);
      setBusyExerciseId(null);
      return;
    }

    selectExercise(exercise.id);
    setMessage(supabaseConfigured
      ? `${exercise.name} foi salvo neste navegador. Entre no Perfil com Supabase Auth para sincronizar com sua conta.`
      : `${exercise.name} foi salvo no modo demonstração, somente neste navegador.`);
    setBusyExerciseId(null);
  }

  async function removeExercise(exercise: (typeof EXERCISE_CATALOG)[number]) {
    if (busyExerciseId) return;
    setBusyExerciseId(exercise.id);
    const client = createBrowserClient();
    if (client && supabaseUserId) {
      const { error } = await client.from("user_selected_exercises").delete()
        .eq("user_id", supabaseUserId)
        .eq("catalog_exercise_id", exercise.id);
      if (error) {
        setMessage(`Não foi possível remover ${exercise.name} da conta. A seleção não foi alterada.`);
        setBusyExerciseId(null);
        return;
      }
      setRemoteSelectedExerciseIds((current) => current.filter((id) => id !== exercise.id));
      setMessage(`${exercise.name} foi removido da sua conta.`);
      setBusyExerciseId(null);
      return;
    }
    deselectExercise(exercise.id);
    setMessage(`${exercise.name} foi removido do modo demonstração neste navegador.`);
    setBusyExerciseId(null);
  }

  const hasFilters = Boolean(query.trim()) || equipmentFilter !== "Todos os equipamentos";

  return (
    <section className="mx-4 mt-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]" aria-labelledby="exercise-library-title">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#007AFF]">Escolha por movimento</p>
          <h2 id="exercise-library-title" className="mt-1 text-xl font-bold">Biblioteca de exercícios</h2>
          <p className="mt-1 text-sm text-neutral-500">Abra um grupo, escolha os movimentos e guarde-os no Meu Plano.</p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#007AFF]">{EXERCISE_CATALOG.length} exercícios</span>
      </div>

      <label htmlFor="exercise-library-search" className="sr-only">Buscar por exercício, grupo muscular ou equipamento</label>
      <input
        id="exercise-library-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar exercício, músculo ou equipamento"
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-sm outline-none transition focus:border-[#007AFF] focus:bg-white focus:ring-2 focus:ring-blue-100"
      />

      <div className="mt-2.5">
        <label htmlFor="exercise-equipment-filter" className="mb-1 block text-xs font-medium text-neutral-600">Filtrar por equipamento</label>
        <select
          id="exercise-equipment-filter"
          value={equipmentFilter}
          onChange={(event) => setEquipmentFilter(event.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-blue-100"
        >
          <option>Todos os equipamentos</option>
          {EXERCISE_EQUIPMENT.map((equipment) => <option key={equipment}>{equipment}</option>)}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {groups.map(([group, exercises]) => {
          const isOpen = openGroups[group] ?? hasFilters;
          return (
            <div key={group} className="overflow-hidden rounded-2xl border border-neutral-200">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`exercise-group-${normalize(group).replace(/\s+/g, "-")}`}
                onClick={() => setOpenGroups((current) => ({ ...current, [group]: !isOpen }))}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-neutral-50"
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#007AFF] transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden="true">›</span>
                <span className="min-w-0 flex-1 text-sm font-semibold">{group}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">{exercises.length}</span>
              </button>
              {isOpen && (
                <ul id={`exercise-group-${normalize(group).replace(/\s+/g, "-")}`} className="divide-y divide-neutral-100 border-t border-neutral-100 px-3.5">
                  {exercises.map((exercise) => {
                    const selected = supabaseUserId
                      ? remoteSelectedExerciseIds.includes(exercise.id)
                      : selectedExerciseIds.includes(exercise.id);
                    const busy = busyExerciseId === exercise.id;
                    return (
                      <li key={exercise.id} className="flex items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-neutral-900">{exercise.name}</p>
                          <p className="mt-0.5 text-xs text-neutral-500">{exercise.equipment ?? "Sem equipamento"} · {exercise.level}</p>
                        </div>
                        {selected ? (
                          <button type="button" disabled={busy} onClick={() => void removeExercise(exercise)} className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-50">
                            {busy ? "Salvando…" : "Adicionado · Remover"}
                          </button>
                        ) : (
                          <button type="button" disabled={busyExerciseId !== null} onClick={() => void addExercise(exercise)} className="shrink-0 rounded-full bg-[#007AFF] px-3 py-2 text-xs font-semibold text-white transition active:scale-[0.98] disabled:opacity-50">
                            {busy ? "Salvando…" : "Adicionar ao meu treino"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        {groups.length === 0 && <p className="rounded-2xl bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">Nenhum exercício encontrado com esses filtros.</p>}
      </div>

      <div className="mt-4 rounded-2xl bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-600">
        <p role="status" aria-live="polite">{message || (supabaseConfigured && !supabaseUserId
          ? "As escolhas ficam neste navegador até você entrar com Supabase Auth no Perfil."
          : !supabaseConfigured
            ? "Modo demonstração: as escolhas ficam somente neste navegador."
            : "Escolhas vinculadas à sua conta Supabase quando o backend estiver configurado.")}</p>
        <Link href="/meu-plano" className="mt-2 inline-flex font-semibold text-[#007AFF]">Abrir Meu Plano para montar uma sessão →</Link>
        {supabaseConfigured && !supabaseUserId && <Link href="/account" className="ml-3 inline-flex font-semibold text-[#007AFF]">Entrar no Perfil →</Link>}
      </div>
    </section>
  );
}
