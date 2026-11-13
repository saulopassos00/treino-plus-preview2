"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EXERCISE_CATALOG } from "@/lib/exercise-catalog";
import { createBrowserClient } from "@/lib/supabase/client";
import { useDemoStore } from "@/lib/store";

type ViewMode = "checking" | "demo" | "account";

export function SelectedExercisesSummary() {
  const { selectedExerciseIds } = useDemoStore();
  const [mode, setMode] = useState<ViewMode>("checking");
  const [remoteIds, setRemoteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const client = createBrowserClient();
    if (!client) {
      setMode("demo");
      setLoading(false);
      return;
    }

    let active = true;
    let currentUserId: string | null = null;
    const load = async (userId: string | null) => {
      if (!active) return;
      currentUserId = userId;
      setError("");
      setRemoteIds([]);
      if (!userId) {
        setMode("demo");
        setLoading(false);
        return;
      }
      setMode("account");
      setLoading(true);
      const { data, error: queryError } = await client
        .from("user_selected_exercises")
        .select("catalog_exercise_id")
        .eq("user_id", userId);
      if (!active || currentUserId !== userId) return;
      if (queryError) {
        setError("Não foi possível carregar as escolhas desta conta. Confirme se a migration da biblioteca foi aplicada.");
        setLoading(false);
        return;
      }
      setRemoteIds((data ?? [])
        .map((row) => row.catalog_exercise_id)
        .filter((id): id is string => typeof id === "string"));
      setLoading(false);
    };

    void client.auth.getSession().then(({ data }) => {
      if (active) void load(data.session?.user.id ?? null);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      void load(session?.user.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const ids = mode === "account" ? remoteIds : selectedExerciseIds;
  const exercises = useMemo(
    () => ids.flatMap((id) => {
      const exercise = EXERCISE_CATALOG.find((item) => item.id === id);
      return exercise ? [exercise] : [];
    }),
    [ids]
  );

  if (mode === "checking" || loading) return null;
  if (error) {
    return (
      <section className="mb-5 rounded-3xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200" role="status">
        {error} <Link href="/treinos" className="font-semibold underline">Abrir biblioteca</Link>
      </section>
    );
  }
  if (exercises.length === 0) return null;

  return (
    <section className="mb-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Exercícios escolhidos</h2>
          <p className="mt-0.5 text-xs text-neutral-500">Inclua estes movimentos nas sessões que você criou abaixo.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#007AFF]">{exercises.length}</span>
      </div>
      <ul className="divide-y divide-neutral-100">
        {exercises.map((exercise) => (
          <li key={exercise.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{exercise.name}</p>
              <p className="text-xs text-neutral-500">{exercise.muscleGroup} · {exercise.equipment}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-neutral-500">{mode === "account" ? "Sincronizado com sua conta Supabase." : "Salvo neste navegador (modo demonstração)."}</span>
        <Link href="/treinos" className="font-semibold text-[#007AFF]">Gerenciar escolhas →</Link>
      </div>
    </section>
  );
}
