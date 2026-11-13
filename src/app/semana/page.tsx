"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useDemoStore, useHasMounted } from "@/lib/store";
import { formatWeekRange, getWeekDays, toLocalDateKey, WEEK_ACTIVITIES } from "@/lib/week";
import { createBrowserClient } from "@/lib/supabase/client";

export default function WeekPlanPage() {
  const store = useDemoStore();
  const mounted = useHasMounted();
  const days = getWeekDays();
  const dateKeys = days.map((day) => day.dateKey);
  const entries = mounted ? store.weeklyRoutine : {};
  const plannedDays = days.filter((day) => entries[day.dateKey]?.activityId).length;
  const completedDays = days.filter((day) => entries[day.dateKey]?.activityId && entries[day.dateKey]?.completed).length;
  const [replanFrom, setReplanFrom] = useState<string | null>(null);
  const [replanTarget, setReplanTarget] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const todayKey = dateKeys.includes(toLocalDateKey(new Date()))
    ? toLocalDateKey(new Date())
    : dateKeys[0];

  const timeZone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo" : "America/Sao_Paulo";
  const scheduledEntries = mounted && store.weeklyReminder.enabled ? days.flatMap((day) => {
    const entry = store.weeklyRoutine[day.dateKey];
    if (!entry?.activityId || entry.completed) return [];
    const [year, month, date] = day.dateKey.split("-").map(Number);
    const [hour, minute] = store.weeklyReminder.time.split(":").map(Number);
    const localTime = new Date(year, month - 1, date, hour, minute, 0, 0);
    if (!Number.isFinite(localTime.getTime()) || localTime.getTime() <= Date.now()) return [];
    return [{ dateKey: day.dateKey, activityId: entry.activityId, scheduledAt: localTime.toISOString() }];
  }) : [];
  const scheduleSignature = JSON.stringify({ enabled: mounted && store.weeklyReminder.enabled, timeZone, entries: scheduledEntries });

  useEffect(() => {
    const client = createBrowserClient();
    setSupabase(client);
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) setSupabaseUserId(data.session?.user.id ?? null);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setSupabaseUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!mounted || !supabase || !supabaseUserId) return;
    let active = true;
    const schedule = JSON.parse(scheduleSignature) as { enabled: boolean; timeZone: string; entries: { dateKey: string; activityId: string; scheduledAt: string }[] };
    void supabase.functions.invoke("sync-weekly-reminders", { body: schedule }).then(({ error }) => {
      if (active && error && schedule.enabled) {
        setReminderMessage(`O lembrete local continua disponível, mas o agendamento push não foi sincronizado: ${error.message}`);
      }
    }).catch(() => {
      if (active && schedule.enabled) setReminderMessage("O lembrete local continua disponível, mas não foi possível sincronizar o push com o servidor.");
    });
    return () => { active = false; };
  }, [mounted, supabase, supabaseUserId, scheduleSignature]);

  async function enableReminder() {
    if (!("Notification" in window)) {
      setReminderMessage("Este navegador não oferece notificações locais.");
      return;
    }
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission === "granted") {
      store.setWeeklyReminder(true);
        setReminderMessage("Lembrete local ativado. Para receber push com o app fechado, entre no Supabase Auth e ative Web Push no Perfil.");
    } else {
      store.setWeeklyReminder(false);
      setReminderMessage("Permissão não concedida. Você ainda pode consultar sua semana no app.");
    }
  }

  return (
    <main className="px-4 pb-8 pt-5">
      <Link href="/" className="text-sm font-semibold text-[#007AFF]">← Início</Link>
      <header className="mb-5 mt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#007AFF]">Seu ritmo, suas escolhas</p>
        <h1 className="mt-1 text-[32px] font-bold tracking-tight">Minha semana</h1>
        <p className="mt-1 text-sm text-neutral-500">{formatWeekRange(days)} · monte um roteiro flexível com o que já existe no app.</p>
      </header>

      <section className="mb-5 rounded-3xl bg-gradient-to-br from-[#123C65] to-[#007AFF] p-5 text-white">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/75">Seu roteiro desta semana</p>
            <p className="mt-1 text-3xl font-bold">{completedDays}<span className="text-lg font-medium text-white/70"> / {plannedDays || 7}</span></p>
            <p className="mt-1 text-sm text-white/80">{plannedDays ? "dias concluídos entre os que você planejou" : "dias planejados — escolha uma atividade abaixo"}</p>
          </div>
          <div className="h-14 w-14 rounded-2xl border border-white/25 p-1.5" aria-hidden="true">
            <svg viewBox="0 0 40 40" className="h-full w-full" fill="none">
              <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,.28)" strokeWidth="4" />
              <circle cx="20" cy="20" r="16" stroke="white" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(completedDays / Math.max(1, plannedDays || 7)) * 100} 100`} pathLength="100" transform="rotate(-90 20 20)" />
            </svg>
          </div>
        </div>
      </section>

      <div className="mb-4 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        Roteiro demonstrativo e flexível — não é prescrição de treino ou alimentação. Suas escolhas completas continuam neste navegador; se você entrar e ativar Web Push no Perfil, apenas os horários futuros de lembrete são sincronizados com o Supabase.
      </div>

      <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <h2 className="text-sm font-bold">Lembrete neste dispositivo</h2>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">Com a página aberta, o app pode mostrar um lembrete local. Com Supabase Auth e Web Push ativos no Perfil, atividades futuras não concluídas também são agendadas no servidor. A entrega continua dependendo do navegador e não é um alarme garantido.</p>
        <div className="mt-3 flex items-center gap-2">
          <label className="min-w-0 flex-1 text-xs text-neutral-600">Horário
            <input type="time" value={store.weeklyReminder.time} onChange={(event) => store.setWeeklyReminder(store.weeklyReminder.enabled, event.target.value)} disabled={!mounted} className="mt-1 block w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </label>
          {store.weeklyReminder.enabled ? (
            <button type="button" onClick={() => { store.setWeeklyReminder(false); setReminderMessage("Lembrete desativado."); }} className="mt-4 rounded-xl bg-neutral-100 px-3 py-2.5 text-xs font-semibold text-neutral-700">Desativar</button>
          ) : (
            <button type="button" disabled={!mounted} onClick={enableReminder} className="mt-4 rounded-xl bg-[#007AFF] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Ativar lembrete</button>
          )}
        </div>
        {reminderMessage && <p role="status" className="mt-2 text-xs text-neutral-600">{reminderMessage}</p>}
      </section>

      <section className="space-y-3" aria-label="Dias da semana">
        {days.map((day) => {
          const entry = entries[day.dateKey] ?? { activityId: "", completed: false };
          const activity = WEEK_ACTIVITIES.find((item) => item.id === entry.activityId);
          const isToday = day.dateKey === todayKey;
          return (
            <article key={day.dateKey} className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${isToday ? "ring-[#007AFF]/40" : "ring-black/[0.05]"}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold capitalize">{day.dayLabel}{isToday ? <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-[#007AFF]">Hoje</span> : null}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{day.shortDate}</p>
                </div>
                {entry.completed ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Concluído</span> : null}
              </div>

              <label className="mt-3 block text-xs font-medium text-neutral-600" htmlFor={`activity-${day.dateKey}`}>Escolha o que combina com este dia</label>
              <select
                id={`activity-${day.dateKey}`}
                value={entry.activityId}
                onChange={(event) => store.updateWeeklyRoutineItem(day.dateKey, { activityId: event.target.value })}
                disabled={!mounted}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#007AFF] disabled:opacity-60"
              >
                <option value="">Sem atividade planejada</option>
                {WEEK_ACTIVITIES.map((item) => <option key={item.id} value={item.id}>{item.label}{item.detail ? ` · ${item.detail}` : ""}</option>)}
              </select>

              {activity ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-neutral-500">{activity.detail}</p>
                  {activity.href ? <Link href={activity.href} className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-[#007AFF]">Abrir atividade</Link> : null}
                  <button
                    type="button"
                    onClick={() => store.updateWeeklyRoutineItem(day.dateKey, { completed: !entry.completed })}
                    className={`rounded-full px-3 py-2 text-xs font-semibold ${entry.completed ? "bg-neutral-100 text-neutral-700" : "bg-emerald-600 text-white"}`}
                  >
                    {entry.completed ? "Desfazer conclusão" : activity.id === "rest" ? "Marcar descanso feito" : "Marcar como concluído"}
                  </button>
                  {!entry.completed ? <button type="button" onClick={() => { setReplanFrom(replanFrom === day.dateKey ? null : day.dateKey); setReplanTarget(""); }} className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{replanFrom === day.dateKey ? "Cancelar replanejamento" : "Replanejar"}</button> : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-neutral-500">Deixe livre ou escolha uma atividade. Você pode mudar quando quiser.</p>
              )}

              {replanFrom === day.dateKey && activity ? (
                <div className="mt-3 rounded-xl bg-amber-50 p-3">
                  <label className="block text-xs font-medium text-amber-950">Mover para um dia livre
                    <select value={replanTarget} onChange={(event) => setReplanTarget(event.target.value)} className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm text-neutral-900">
                      <option value="">Escolha outro dia</option>
                      {days.filter((target) => target.dateKey !== day.dateKey && !entries[target.dateKey]?.activityId).map((target) => <option key={target.dateKey} value={target.dateKey}>{target.dayLabel} · {target.shortDate}</option>)}
                    </select>
                  </label>
                  <button type="button" disabled={!replanTarget} onClick={() => {
                    const moved = store.moveWeeklyRoutineItem(day.dateKey, replanTarget);
                    setReminderMessage(moved ? "Atividade movida. O dia de origem ficou livre." : "Não foi possível mover para esse dia.");
                    setReplanFrom(null);
                    setReplanTarget("");
                  }} className="mt-2 w-full rounded-lg bg-amber-800 py-2.5 text-xs font-semibold text-white disabled:opacity-40">Confirmar novo dia</button>
                  {days.filter((target) => target.dateKey !== day.dateKey && !entries[target.dateKey]?.activityId).length === 0 && <p className="mt-2 text-xs text-amber-900">Não há outro dia livre nesta semana. Libere um dia ou altere a semana manualmente.</p>}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <button
        type="button"
        onClick={() => {
          if (window.confirm("Limpar as escolhas desta semana?")) store.clearWeeklyRoutine(dateKeys);
        }}
        disabled={!mounted || plannedDays === 0}
        className="mt-4 w-full rounded-xl bg-neutral-100 py-3 text-sm font-semibold text-neutral-700 disabled:opacity-50"
      >
        Limpar esta semana
      </button>
    </main>
  );
}
