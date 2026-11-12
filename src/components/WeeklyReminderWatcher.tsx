"use client";

import { useEffect } from "react";
import { useDemoStore, useHasMounted } from "@/lib/store";
import { toLocalDateKey, WEEK_ACTIVITIES } from "@/lib/week";

export function WeeklyReminderWatcher() {
  const store = useDemoStore();
  const mounted = useHasMounted();
  const reminder = store.weeklyReminder;
  const weeklyRoutine = store.weeklyRoutine;
  const markWeeklyReminderSent = store.markWeeklyReminderSent;

  useEffect(() => {
    if (!mounted || !reminder.enabled || typeof window === "undefined" || !("Notification" in window)) return;
    const checkReminder = () => {
      const now = new Date();
      const dateKey = toLocalDateKey(now);
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const activity = weeklyRoutine[dateKey]?.activityId;
      if (currentTime !== reminder.time || !activity || reminder.lastSentDate === dateKey || Notification.permission !== "granted") return;
      const planned = WEEK_ACTIVITIES.find((item) => item.id === activity);
      new Notification("Seu roteiro Treino Plus", {
        body: planned ? `Hoje você planejou: ${planned.label}.` : "Confira sua atividade planejada para hoje.",
      });
      markWeeklyReminderSent(dateKey);
    };
    const timer = window.setInterval(checkReminder, 20_000);
    return () => window.clearInterval(timer);
  }, [mounted, reminder.enabled, reminder.time, reminder.lastSentDate, weeklyRoutine, markWeeklyReminderSent]);

  return null;
}
