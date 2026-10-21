"use client";

import { useEffect, useRef, useState } from "react";
import { BackNav } from "@/components/BackNav";
import { WorkoutRow } from "@/components/SessionCard";
import { TimerRing } from "@/components/Illustrations";
import { FAST_EXERCISES } from "@/lib/content";
import { useDemoStore } from "@/lib/store";
import { useToast } from "@/components/Toast";
import {
  playCountdownBeep,
  playRestTone,
  playStartTone,
  playVictoryFanfare,
} from "@/lib/sound";
import { requestScreenWakeLock } from "@/lib/wakelock";

type Phase = "idle" | "work" | "rest" | "done";

export default function FastTrainerPage() {
  const { completeFastWorkout } = useDemoStore();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [exIndex, setExIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [secsLeft, setSecsLeft] = useState(0);
  const [totalSecs, setTotalSecs] = useState(40);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const phaseRef = useRef(phase);
  const exRef = useRef(exIndex);
  const roundRef = useRef(round);
  const soundRef = useRef(soundEnabled);
  phaseRef.current = phase;
  exRef.current = exIndex;
  roundRef.current = round;
  soundRef.current = soundEnabled;

  // Manter a tela ligada durante o treino ativo
  useEffect(() => {
    if (phase === "work" || phase === "rest") {
      const releaseLock = requestScreenWakeLock();
      return () => releaseLock();
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "work" && phase !== "rest") return;
    const id = setInterval(() => {
      setSecsLeft((s) => {
        if (s > 1) {
          const nextSec = s - 1;
          // Alerta sonoro nos últimos 3 segundos (3, 2, 1)
          if (nextSec <= 3 && soundRef.current) {
            playCountdownBeep(700 + (3 - nextSec) * 70);
          }
          return nextSec;
        }

        // tick hits 0 → advance
        const p = phaseRef.current;
        const ei = exRef.current;
        const r = roundRef.current;
        const ex = FAST_EXERCISES[ei];

        if (p === "work") {
          setPhase("rest");
          setTotalSecs(ex.restSec);
          if (soundRef.current) playRestTone();
          return ex.restSec;
        }

        // after rest
        if (ei < FAST_EXERCISES.length - 1) {
          const next = ei + 1;
          setExIndex(next);
          setPhase("work");
          setTotalSecs(FAST_EXERCISES[next].workSec);
          if (soundRef.current) playStartTone();
          return FAST_EXERCISES[next].workSec;
        }
        if (r < 4) {
          setRound(r + 1);
          setExIndex(0);
          setPhase("work");
          setTotalSecs(FAST_EXERCISES[0].workSec);
          if (soundRef.current) playStartTone();
          toast(`Round ${r + 1} de 4`);
          return FAST_EXERCISES[0].workSec;
        }
        setPhase("done");
        completeFastWorkout();
        if (soundRef.current) playVictoryFanfare();
        toast("Treino completo! Streak atualizado 🔥");
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, completeFastWorkout, toast]);

  function start() {
    setRound(1);
    setExIndex(0);
    setPhase("work");
    setSecsLeft(FAST_EXERCISES[0].workSec);
    setTotalSecs(FAST_EXERCISES[0].workSec);
    if (soundEnabled) playStartTone();
    toast("Timer iniciado");
  }

  function stop() {
    setPhase("idle");
    setSecsLeft(0);
  }

  const displayMin =
    phase === "idle" ? 15 : phase === "done" ? "✓" : secsLeft;
  const progress =
    phase === "idle" || phase === "done"
      ? 0.7
      : totalSecs > 0
        ? secsLeft / totalSecs
        : 0;

  const current = FAST_EXERCISES[exIndex];

  return (
    <main className="pb-6 pt-2">
      <BackNav href="/treinos" label="Treinos" title="Fast Trainer" />

      <button
        type="button"
        onClick={phase === "idle" || phase === "done" ? start : undefined}
        className="relative mx-4 mt-2 block w-[calc(100%-2rem)] overflow-hidden rounded-[22px] bg-gradient-to-br from-[#1C1C1E] to-[#2C2C2E] p-6 text-left text-white shadow-lg transition active:scale-[0.99]"
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-white/80">
          {phase === "work"
            ? `Round ${round}/4 · Trabalho`
            : phase === "rest"
              ? `Round ${round}/4 · Descanso`
              : phase === "done"
                ? "Concluído"
                : "Sessão rápida"}
        </div>
        <h2 className="mt-1 text-3xl font-bold">
          {phase === "idle" || phase === "done" ? "Quicky" : current.t}
        </h2>
        <p className="mt-1 text-sm font-medium text-white/80">
          {phase === "idle"
            ? "Circuito HIIT · 4 rounds · sem equipamento"
            : phase === "done"
              ? "Ótimo trabalho — streak atualizado"
              : phase === "rest"
                ? `Descanso · ${secsLeft}s`
                : `${secsLeft}s restantes`}
        </p>
        <div className="mt-4 flex justify-center">
          <TimerRing mins={displayMin} progress={progress} unit={phase === "idle" ? "min" : "seg"} className="h-32 w-32" />
        </div>
      </button>

      <div className="mx-4 mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#007AFF]/12 px-2.5 py-1 text-xs font-semibold text-[#007AFF]">
            40s / 20s
          </span>
          <span className="rounded-full bg-neutral-200/70 px-2.5 py-1 text-xs font-medium text-neutral-800">
            4 rounds
          </span>
          <span className="rounded-full bg-neutral-200/70 px-2.5 py-1 text-xs font-medium text-neutral-800">
            Bodyweight
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            toast(next ? "Som ativado 🔊" : "Som silenciado 🔇");
          }}
          aria-label={soundEnabled ? "Silenciar áudio do timer" : "Ativar áudio do timer"}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            soundEnabled
              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
              : "bg-neutral-200 text-neutral-500 hover:bg-neutral-300"
          }`}
        >
          <span>{soundEnabled ? "🔊 Som ligado" : "🔇 Mudo"}</span>
        </button>
      </div>

      <p className="px-5 pb-3 pt-5 text-xl font-bold">Exercícios</p>
      <div className="px-4">
        {FAST_EXERCISES.map((w, i) => (
          <WorkoutRow
            key={w.t}
            part={w.part}
            title={w.t}
            caption={
              phase !== "idle" && phase !== "done" && i === exIndex
                ? `${phase === "work" ? "Agora" : "Descanso"} · ${w.m}`
                : w.m
            }
            onClick={() => toast(`Exercício: ${w.t}`)}
          />
        ))}
      </div>

      <div className="space-y-2 px-4 pt-4">
        {phase === "idle" || phase === "done" ? (
          <button
            onClick={start}
            className="w-full rounded-2xl bg-[#007AFF] py-3.5 text-[15px] font-semibold text-white"
          >
            {phase === "done" ? "Treinar de novo" : "Iniciar agora"}
          </button>
        ) : (
          <button
            onClick={stop}
            className="w-full rounded-2xl bg-red-500 py-3.5 text-[15px] font-semibold text-white"
          >
            Parar timer
          </button>
        )}
        <button
          onClick={() => toast("Outras opções: 10 min · 20 min")}
          className="w-full rounded-2xl bg-neutral-200/80 py-3.5 text-[15px] font-semibold"
        >
          Ver outras durações
        </button>
      </div>
    </main>
  );
}
