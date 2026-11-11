"use client";

import { useState } from "react";
import { IconCheck, IconClose } from "./Icons";
import { formatBRL } from "@/lib/data";
import { useDemoStore } from "@/lib/store";
import type { Workout } from "@/types";

export function CheckoutModal({
  open,
  onClose,
  workout,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  workout: Workout;
  onSuccess?: () => void;
}) {
  const { purchaseWorkout, user, signIn } = useDemoStore();
  const [step, setStep] = useState<"form" | "processing" | "done">("form");
  const [email, setEmail] = useState(user?.email ?? "");
  const [hint, setHint] = useState<string | null>(null);

  if (!open) return null;

  async function pay() {
    setStep("processing");
    const trimmed = email.trim();
    setHint("Prévia local — nenhuma cobrança foi realizada.");
    await new Promise((r) => setTimeout(r, 400));
    if (!user && trimmed) signIn(trimmed);
    purchaseWorkout(workout.id);
    setStep("done");
    onSuccess?.();
  }

  function close() {
    setStep("form");
    setHint(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <button className="absolute inset-0" aria-label="Fechar" onClick={close} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-violet-500">
              Checkout do treino
            </p>
            <h2 className="text-lg font-semibold">Prévia de compra</h2>
          </div>
          <button onClick={close} className="rounded-full bg-neutral-100 p-2">
            <IconClose />
          </button>
        </div>

        {step === "done" ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <IconCheck className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-semibold">Aquisição simulada</h3>
            <p className="mt-2 text-sm text-neutral-500">
              {workout.title} foi liberado somente neste app de demonstração. Nenhuma cobrança foi processada.
            </p>
            <button
              onClick={close}
              className="mt-6 w-full rounded-2xl bg-black py-3.5 text-sm font-semibold text-white"
            >
              Abrir prévia
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 rounded-2xl bg-neutral-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">{workout.title} · valor de referência</span>
                <span className="font-semibold">{formatBRL(workout.priceBRL)}</span>
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                Esta demonstração não é uma venda real.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-500">E-mail</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder="voce@email.com"
                />
              </label>
            </div>

            {hint && (
              <p className="mt-3 text-center text-[11px] text-amber-600">{hint}</p>
            )}

            <button
              onClick={pay}
              disabled={step === "processing" || !email.trim()}
              className="mt-5 w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {step === "processing"
                ? "Processando…"
                : "Liberar prévia local"}
            </button>
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-center text-xs leading-relaxed text-amber-950" role="note">
              Esta versão estática só libera uma prévia local, sem pagamento ou cobrança. Para vender de verdade, o app precisa de um backend que valide o pagamento antes de liberar o conteúdo.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
