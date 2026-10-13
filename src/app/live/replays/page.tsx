"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { IconChevron, IconClose, IconLock, IconPlay } from "@/components/Icons";
import { SubscribeModal } from "@/components/SubscribeModal";
import { useDemoStore, useHasMounted } from "@/lib/store";
import {
  liveReplays,
  resolveReplaySource,
  type LiveReplay,
} from "@/lib/replays";

const filters = [
  { id: "all", label: "Todas" },
  { id: "free", label: "Acesso aberto" },
  { id: "premium", label: "Premium" },
] as const;

type ReplayFilter = (typeof filters)[number]["id"];

function formatRecordedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function RecordedLivesPage() {
  const { premiumSubscribed } = useDemoStore();
  const mounted = useHasMounted();
  const [filter, setFilter] = useState<ReplayFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedReplay, setSelectedReplay] = useState<LiveReplay | null>(null);
  const [subscribe, setSubscribe] = useState(false);
  const hasPremium = mounted && premiumSubscribed;

  const filteredReplays = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return liveReplays.filter((replay) => {
      const matchesAccess =
        filter === "all" ||
        (filter === "free" && replay.access === "free") ||
        (filter === "premium" && replay.access === "premium");
      const searchable = [
        replay.title,
        replay.description,
        replay.trainer,
        replay.category,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return matchesAccess && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [filter, query]);

  function openReplay(replay: LiveReplay) {
    if (replay.access === "premium" && !hasPremium) {
      setSubscribe(true);
      return;
    }
    setSelectedReplay(replay);
  }

  const selectedSource = selectedReplay
    ? resolveReplaySource(selectedReplay.playbackUrl)
    : null;

  return (
    <main className="px-4 pb-8 pt-6">
      <header className="mb-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
          Assista no seu ritmo
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Lives gravadas
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Replays para rever os treinos quando for melhor para você.
        </p>
      </header>

      <section className="relative mb-5 overflow-hidden rounded-[24px] bg-gradient-to-br from-rose-700 via-orange-600 to-amber-600 p-5 text-white shadow-lg shadow-orange-500/15">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/15 blur-3xl" />
        <div className="relative z-10">
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
            Ao vivo e sob demanda
          </span>
          <h2 className="mt-4 max-w-[17rem] text-2xl font-bold leading-tight tracking-tight">
            Perdeu a transmissão? O treino continua.
          </h2>
          <p className="mt-2 max-w-[19rem] text-sm text-white/85">
            As gravações ficam reunidas aqui para você voltar quando quiser.
          </p>
          <Link
            href="/live/free"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition active:scale-[0.98]"
          >
            <span>Ver próxima live</span>
            <IconChevron className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {liveReplays.length > 0 ? (
        <>
          <label className="mb-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/[0.05]">
            <svg
              className="h-5 w-5 shrink-0 text-neutral-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path strokeLinecap="round" d="m16 16 4.5 4.5" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
              placeholder="Buscar treino, modalidade ou treinador"
              aria-label="Buscar lives gravadas"
            />
          </label>

          <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  filter === item.id
                    ? "bg-black text-white"
                    : "bg-white text-neutral-600 ring-1 ring-black/[0.06]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {filteredReplays.length > 0 ? (
            <div className="space-y-4">
              {filteredReplays.map((replay) => {
                const locked = replay.access === "premium" && !hasPremium;
                const metadata = [
                  replay.category,
                  replay.recordedAt ? formatRecordedAt(replay.recordedAt) : "",
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <article
                    key={replay.id}
                    className="overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-black/[0.04]"
                  >
                    <button
                      type="button"
                      onClick={() => openReplay(replay)}
                      className="group relative block aspect-video w-full overflow-hidden"
                      style={{
                        backgroundImage:
                          replay.coverGradient ||
                          "linear-gradient(135deg, #9f1239, #ea580c 58%, #f59e0b)",
                      }}
                      aria-label={`${locked ? "Desbloquear" : "Assistir"}: ${replay.title}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg transition group-hover:scale-105">
                          {locked ? (
                            <IconLock className="h-6 w-6" />
                          ) : (
                            <IconPlay className="h-7 w-7" />
                          )}
                        </span>
                      </div>
                      <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                        {replay.access === "premium" ? "PREMIUM" : "ACESSO ABERTO"}
                      </span>
                      {replay.durationMin !== undefined && replay.durationMin > 0 ? (
                        <span className="absolute bottom-3 right-3 rounded-md bg-black/65 px-2 py-1 text-xs font-medium text-white">
                          {replay.durationMin} min
                        </span>
                      ) : null}
                    </button>
                    <div className="p-4">
                      {metadata ? (
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                          {metadata}
                        </p>
                      ) : null}
                      <h2 className="mt-1 text-lg font-semibold leading-snug">
                        {replay.title}
                      </h2>
                      {replay.description ? (
                        <p className="mt-1 text-sm text-neutral-500">
                          {replay.description}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        {replay.trainer ? (
                          <span className="text-xs font-medium text-neutral-500">
                            {replay.trainer}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openReplay(replay)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white"
                        >
                          {locked ? <IconLock className="h-3.5 w-3.5" /> : <IconPlay className="h-3.5 w-3.5" />}
                          {locked ? "Desbloquear" : "Assistir"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-black/[0.04]">
              <p className="font-semibold">Nenhum replay encontrado</p>
              <p className="mt-1 text-sm text-neutral-500">
                Tente outra busca ou escolha um filtro diferente.
              </p>
            </div>
          )}
        </>
      ) : (
        <section className="rounded-[24px] bg-white p-6 text-center shadow-sm ring-1 ring-black/[0.04]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <IconPlay className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            As primeiras gravações estão chegando
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
            Assim que uma live for salva, ela aparecerá nesta biblioteca. Você vai
            encontrar conteúdos com acesso aberto e replays exclusivos Premium.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-neutral-50 px-3 py-2.5 text-left text-xs leading-relaxed text-neutral-500">
            <IconLock className="h-4 w-4 shrink-0" />
            <span>
              Neste preview, o bloqueio Premium é demonstrativo. A proteção real
              depende da integração da assinatura e da plataforma de vídeo.
            </span>
          </div>
        </section>
      )}

      {selectedReplay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={selectedReplay.title}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-xs text-neutral-500">
                  {selectedReplay.category} · {selectedReplay.trainer}
                </p>
                <h2 className="truncate font-semibold">{selectedReplay.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReplay(null)}
                className="shrink-0 rounded-full bg-neutral-100 p-2"
                aria-label="Fechar vídeo"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <div className="relative aspect-video bg-black">
              {selectedSource?.kind === "iframe" ? (
                <iframe
                  src={selectedSource.src}
                  title={selectedReplay.title}
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : selectedSource?.kind === "video" ? (
                <video
                  src={selectedSource.src}
                  className="absolute inset-0 h-full w-full"
                  controls
                  autoPlay
                  playsInline
                />
              ) : selectedSource?.kind === "link" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                  <IconPlay className="h-10 w-10" />
                  <p className="text-sm text-white/80">
                    Este replay será aberto na plataforma de vídeo da gravação.
                  </p>
                  <a
                    href={selectedSource.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black"
                  >
                    Abrir vídeo
                  </a>
                </div>
              ) : (
                <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white">
                  Não foi possível abrir o vídeo. Confira o link cadastrado para este replay.
                </p>
              )}
            </div>
            {selectedReplay.description ? (
              <p className="p-4 text-sm text-neutral-600">
                {selectedReplay.description}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <SubscribeModal open={subscribe} onClose={() => setSubscribe(false)} />
    </main>
  );
}
