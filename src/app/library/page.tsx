"use client";

import { useMemo, useState } from "react";
import { workouts } from "@/lib/data";
import { useDemoStore, useHasMounted } from "@/lib/store";
import { WorkoutCard } from "@/components/WorkoutCard";
import type { WorkoutCategory } from "@/types";

const filters: Array<"Todos" | WorkoutCategory> = [
  "Todos",
  "Força",
  "HIIT",
  "Yoga",
  "Mobilidade",
  "Cardio",
  "Core",
];

export default function LibraryPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const { owns } = useDemoStore();
  const mounted = useHasMounted();

  const list = useMemo(
    () =>
      filter === "Todos"
        ? workouts
        : workouts.filter((w) => w.category === filter),
    [filter]
  );

  return (
    <main className="px-4 pb-4 pt-6">
      <header className="mb-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
          Sob demanda
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Biblioteca
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Prévia da biblioteca · valores ilustrativos em BRL
        </p>
        <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-950" role="note">
          Esta versão não processa pagamentos: o acesso liberado é apenas uma prévia local, salva neste navegador, sem cobrança. Para vender de verdade, é necessário integrar um backend e validar o pagamento no servidor.
        </p>
      </header>

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "bg-black text-white"
                : "bg-white text-neutral-600 ring-1 ring-black/[0.06]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {list.map((w) => (
          <WorkoutCard
            key={w.id}
            workout={w}
            owned={mounted ? owns(w.id) : false}
          />
        ))}
      </div>
    </main>
  );
}
