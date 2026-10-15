"use client";

import { useParams } from "next/navigation";
import { BackNav } from "@/components/BackNav";
import { SessionCard } from "@/components/SessionCard";
import { SilhouetteCollage } from "@/components/BodySilhouette";
import { PROTO_ADV_BLOCKS, PROTO_INTER_SESSIONS } from "@/lib/content";
import { useDemoStore, useHasMounted } from "@/lib/store";
import { useToast } from "@/components/Toast";
import type { ProtocolLevel } from "@/types";

export default function ProtocoloPage() {
  const params = useParams();
  const level = (params.level === "avancado" ? "avancado" : "inter") as ProtocolLevel;
  const isInter = level === "inter";
  const {
    protocolProgress,
    protocolStarted,
    protocolRemovedSessions,
    startProtocol,
    bumpProtocol,
    toggleProtocolInPlan,
    removeProtocolSession,
    restoreProtocolSessions,
    resetProtocolProgress,
  } = useDemoStore();
  const mounted = useHasMounted();
  const { toast } = useToast();
  const pct = mounted ? protocolProgress[level] : 0;
  const inMyPlan = mounted && protocolStarted[level];

  const allSessions = isInter ? PROTO_INTER_SESSIONS : PROTO_ADV_BLOCKS;
  const removedSessions = mounted ? protocolRemovedSessions[level] : [];
  const sessions = allSessions.filter((session) => !removedSessions.includes(session.title));

  function continueToday() {
    startProtocol(level);
    toast("Protocolo aberto. O progresso só muda quando você registrar um treino concluído.");
  }

  function completeToday() {
    bumpProtocol(level, 12);
    toast(`Treino registrado como concluído · ${Math.min(100, pct + 12)}%`);
  }

  function togglePlan() {
    const inPlan = toggleProtocolInPlan(level);
    const name = isInter ? "Intermediário" : "Avançado";
    toast(
      inPlan
        ? `${name} adicionado ao Meu plano`
        : `${name} removido do Meu plano. Seu progresso foi preservado.`
    );
  }

  return (
    <main className="pb-6 pt-2">
      <BackNav href="/treinos" label="Treinos" title="Protocolo" />

      <div className="mx-4 mt-2 overflow-hidden rounded-[14px] bg-white shadow-sm ring-1 ring-black/[0.04]">
        <div
          className={`relative min-h-[132px] p-5 text-white ${
            isInter
              ? "bg-gradient-to-br from-[#1C3A5F] to-[#007AFF]"
              : "bg-gradient-to-br from-[#2C1F4A] to-[#5856D6]"
          }`}
        >
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
            {isInter ? "Nível 2" : "Nível 3"}
          </span>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/70">
            {isInter ? "8 semanas · hipertrofia" : "12 semanas · periodização"}
            {pct > 0 ? ` · ${pct}%` : ""}
          </p>
          <h3 className="text-[22px] font-bold">
            {isInter ? "Intermediário" : "Avançado"}
          </h3>
          <div className="absolute bottom-2 right-2">
            <SilhouetteCollage
              parts={isInter ? ["peito", "costas", "pernas"] : ["ombros", "costas", "gluteo"]}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 p-3">
          {isInter ? (
            <>
              <span className="rounded-full bg-[#007AFF]/12 px-2.5 py-1 text-xs font-semibold text-[#007AFF]">
                4× / semana
              </span>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium">
                45–60 min
              </span>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium">
                Progressão linear
              </span>
            </>
          ) : (
            <>
              <span className="rounded-full bg-[#007AFF]/12 px-2.5 py-1 text-xs font-semibold text-[#007AFF]">
                5–6× / semana
              </span>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium">
                60–75 min
              </span>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium">
                PPL · RPE
              </span>
            </>
          )}
        </div>
      </div>

      <p className="px-5 pt-3 text-sm text-neutral-500">
        {isInter
          ? "Divisão ABC + full body. Para quem já treina há 6 meses ou mais."
          : "Para atletas experientes. Mesociclos de volume, intensidade e deload."}
      </p>

      {pct > 0 && (
        <div className="mx-5 mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-[#007AFF] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <p className="px-5 pb-3 pt-5 text-xl font-bold">
        {isInter ? "Semana 3" : "Estrutura"}
      </p>
      <div className="px-4">
        {sessions.length > 0 ? sessions.map((s) => (
          <div key={s.title} className="mb-2 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SessionCard
                part={s.part}
                title={s.title}
                caption={s.caption}
                tag={s.tag || undefined}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                removeProtocolSession(level, s.title);
                toast(`${s.title} removido do protocolo. Você pode restaurar a lista padrão.`);
              }}
              aria-label={`Remover ${s.title} do protocolo`}
              className="mb-2 shrink-0 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
            >
              Remover
            </button>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-center">
            <p className="text-sm font-semibold">Você removeu todas as sessões desta lista.</p>
            <p className="mt-1 text-xs text-neutral-500">Restaure a lista padrão se quiser adicioná-las novamente.</p>
          </div>
        )}
        {mounted && removedSessions.length > 0 && (
          <button
            type="button"
            onClick={() => {
              restoreProtocolSessions(level);
              toast("Sessões padrão restauradas.");
            }}
            className="mt-1 w-full rounded-xl bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-700"
          >
            Restaurar sessões removidas ({removedSessions.length})
          </button>
        )}
      </div>

      <div className="space-y-2 px-4 pt-4">
        <button
          onClick={continueToday}
          className="w-full rounded-2xl bg-[#007AFF] py-3.5 text-center text-[15px] font-semibold text-white"
        >
          {isInter
            ? pct > 0
              ? "Continuar treino de hoje"
              : "Começar protocolo"
            : pct > 0
              ? "Continuar protocolo"
              : "Começar protocolo"}
        </button>
        <button
          type="button"
          onClick={completeToday}
          className="w-full rounded-2xl bg-emerald-50 py-3 text-center text-sm font-semibold text-emerald-700"
        >
          Registrar treino concluído (+12%)
        </button>
        <button
          type="button"
          onClick={togglePlan}
          disabled={!mounted}
          className={`w-full rounded-2xl py-3 text-center text-sm font-semibold disabled:opacity-50 ${
            inMyPlan ? "bg-neutral-100 text-neutral-700" : "bg-blue-50 text-[#007AFF]"
          }`}
        >
          {inMyPlan ? "Remover do Meu plano" : "Adicionar ao Meu plano"}
        </button>
        {pct > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Zerar o progresso deste protocolo? Esta ação não pode ser desfeita.")) {
                resetProtocolProgress(level);
                toast("Progresso zerado. O protocolo continua no seu plano.");
              }
            }}
            className="w-full rounded-2xl bg-amber-50 py-3 text-center text-sm font-semibold text-amber-800"
          >
            Corrigir progresso incorreto · zerar percentual
          </button>
        )}
        <button
          onClick={() => toast(isInter ? "PDF do protocolo baixado (demo)" : "Ver Intermediário")}
          className="w-full rounded-2xl bg-neutral-200/80 py-3.5 text-center text-[15px] font-semibold text-neutral-800"
        >
          {isInter ? "Baixar PDF" : "Ver Intermediário"}
        </button>
      </div>
    </main>
  );
}
