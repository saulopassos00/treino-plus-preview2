"use client";

import { IconClose } from "./Icons";
import { formatBRL, PREMIUM_PRICE_BRL, PREMIUM_PERIOD } from "@/lib/data";
import { useDemoStore } from "@/lib/store";

export function PortalModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { premiumSubscribed, premiumRenewsAt, cancelPremium, subscribePremium } =
    useDemoStore();

  if (!open) return null;

  const renewLabel = premiumRenewsAt
    ? new Date(premiumRenewsAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <button className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Assinatura · simulação local
            </p>
            <h2 className="text-lg font-semibold">Gerenciar assinatura</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-neutral-100 p-2">
            <IconClose />
          </button>
        </div>

        <div className="rounded-2xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Treino Premium · demonstração</p>
              <p className="text-sm text-neutral-500">
                {formatBRL(PREMIUM_PRICE_BRL)}/{PREMIUM_PERIOD}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                premiumSubscribed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {premiumSubscribed ? "Ativa · demo" : "Inativa · demo"}
            </span>
          </div>
          {premiumSubscribed && renewLabel && (
            <p className="mt-3 text-xs text-neutral-400">
              Próxima renovação (simulada): {renewLabel}
            </p>
          )}
        </div>

        {premiumSubscribed ? (
          <button
            onClick={() => {
              cancelPremium();
              onClose();
            }}
            className="mt-5 w-full rounded-2xl border border-red-200 py-3.5 text-sm font-semibold text-red-600"
          >
            Simular cancelamento
          </button>
        ) : (
          <button
            onClick={() => {
              subscribePremium();
              onClose();
            }}
            className="mt-5 w-full rounded-2xl bg-black py-3.5 text-sm font-semibold text-white"
          >
            Simular reativação
          </button>
        )}
        <p className="mt-3 text-center text-[11px] text-neutral-400">
          Apenas muda o estado local deste navegador. Nenhuma assinatura real é criada ou cancelada; sem cobrança.
        </p>
      </div>
    </div>
  );
}
