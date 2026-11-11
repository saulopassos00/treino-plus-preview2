"use client";

import { useState } from "react";
import { IconCheck, IconClose } from "./Icons";
import { formatBRL, PREMIUM_PERIOD, PREMIUM_PRICE_BRL } from "@/lib/data";
import { useDemoStore } from "@/lib/store";

const perks = [
  "Acesso demonstrativo à área Premium",
  "Estado salvo somente neste navegador",
  "Sem cobrança nesta versão",
];

export function SubscribeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { subscribePremium, user, signIn } = useDemoStore();
  const [step, setStep] = useState<"form" | "processing" | "done">("form");
  const [email, setEmail] = useState(user?.email ?? "");
  const [hint, setHint] = useState<string | null>(null);

  if (!open) return null;

  async function subscribe() {
    setStep("processing");
    const trimmed = email.trim();
    setHint("Prévia local — nenhuma assinatura ou cobrança foi realizada.");
    await new Promise((r) => setTimeout(r, 400));
    if (!user && trimmed) signIn(trimmed);
    subscribePremium();
    setStep("done");
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
            <p className="text-xs font-medium uppercase tracking-wider text-fuchsia-500">
              Prévia Premium · sem cobrança
            </p>
            <h2 className="text-lg font-semibold">Treino Premium</h2>
          </div>
          <button onClick={close} className="rounded-full bg-neutral-100 p-2">
            <IconClose />
          </button>
        </div>

        {step === "done" ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-600">
              <IconCheck className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-semibold">Prévia ativada (demonstração)</h3>
            <p className="mt-2 text-sm text-neutral-500">
              O acesso foi atualizado apenas neste app de demonstração.
            </p>
            <button
              onClick={close}
              className="mt-6 w-full rounded-2xl bg-black py-3.5 text-sm font-semibold text-white"
            >
              Continuar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-400 p-5 text-white">
              <p className="text-sm text-white/80">Preço de referência · assinatura mensal</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {formatBRL(PREMIUM_PRICE_BRL)}
                <span className="text-base font-normal text-white/80">
                  /{PREMIUM_PERIOD}
                </span>
              </p>
              <ul className="mt-4 space-y-2">
                {perks.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm">
                    <IconCheck className="h-4 w-4 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs text-neutral-500">E-mail</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-fuchsia-400"
                placeholder="voce@email.com"
              />
            </label>
            {hint && (
              <p className="mt-3 text-center text-[11px] text-amber-600">{hint}</p>
            )}

            <button
              onClick={subscribe}
              disabled={step === "processing" || !email.trim()}
              className="mt-5 w-full rounded-2xl bg-fuchsia-600 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {step === "processing"
                ? "Conectando…"
                : "Ativar prévia local"}
            </button>
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-center text-xs leading-relaxed text-amber-950" role="note">
              Nesta hospedagem estática, este botão só altera o estado demonstrativo salvo no navegador: não há checkout nem cobrança. Para vender uma assinatura, será necessário um backend com validação segura do pagamento.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
