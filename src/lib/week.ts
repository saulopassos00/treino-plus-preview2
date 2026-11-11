export const WEEK_ACTIVITIES = [
  { id: "inter", label: "Protocolo intermediário", href: "/treinos/protocolo/inter", detail: "Sessão do protocolo" },
  { id: "advanced", label: "Protocolo avançado", href: "/treinos/protocolo/avancado", detail: "Sessão do protocolo" },
  { id: "fast", label: "Fast Trainer", href: "/treinos/fast", detail: "15 minutos" },
  { id: "run5", label: "Corrida 0 → 5 km", href: "/corrida/5k", detail: "Etapa do seu programa" },
  { id: "run10", label: "Corrida 0 → 10 km", href: "/corrida/10k", detail: "Etapa do seu programa" },
  { id: "replays", label: "Lives gravadas", href: "/live/replays", detail: "Assista quando quiser" },
  { id: "nutrition", label: "Planejar refeições", href: "/nutricao", detail: "Organização alimentar" },
  { id: "my-plan", label: "Editar Meu plano", href: "/meu-plano", detail: "Seus treinos personalizados" },
  { id: "rest", label: "Descanso ou recuperação", href: null, detail: "Um dia sem treino também faz parte" },
] as const;

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekDays(referenceDate = new Date()) {
  const monday = new Date(referenceDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      date,
      dateKey: toLocalDateKey(date),
      dayLabel: date.toLocaleDateString("pt-BR", { weekday: "long" }),
      shortLabel: date.toLocaleDateString("pt-BR", { weekday: "short" }),
      shortDate: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    };
  });
}

export function formatWeekRange(days: ReturnType<typeof getWeekDays>): string {
  if (days.length < 7) return "";
  const start = days[0].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const end = days[6].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${start} – ${end}`;
}
