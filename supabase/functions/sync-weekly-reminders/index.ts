import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const APP_ORIGIN = "https://saulopassos00.github.io";
const APP_BASE_PATH = "/treino-plus-preview2";
const DEFAULT_ORIGIN = APP_ORIGIN;
const ACTIVITIES: Record<string, { label: string; path: string }> = {
  inter: { label: "protocolo intermediário", path: "/treinos/protocolo/inter/" },
  advanced: { label: "protocolo avançado", path: "/treinos/protocolo/avancado/" },
  fast: { label: "Fast Trainer", path: "/treinos/fast/" },
  run5: { label: "corrida 0 a 5 km", path: "/corrida/5k/" },
  run10: { label: "corrida 0 a 10 km", path: "/corrida/10k/" },
  replays: { label: "lives gravadas", path: "/live/replays/" },
  nutrition: { label: "planejamento de refeições", path: "/nutricao/" },
  "my-plan": { label: "Meu plano", path: "/meu-plano/" },
  rest: { label: "descanso ou recuperação", path: "/semana/" },
};

type Entry = { dateKey: string; activityId: string; scheduledAt: string };
type UnknownRecord = Record<string, unknown>;

function headersFor(request: Request): Record<string, string> {
  const allowed = Deno.env.get("CORS_ORIGIN") ?? DEFAULT_ORIGIN;
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin === allowed || origin === "http://localhost:3000" ? origin : allowed,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function reply(request: Request, body: UnknownRecord, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: headersFor(request) });
}

function publishableKey(): string | null {
  const keySet = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keySet) {
    try {
      const parsed = JSON.parse(keySet) as Record<string, string>;
      if (typeof parsed.default === "string") return parsed.default;
    } catch {
      return null;
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? null;
}

function secretKey(): string | null {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (typeof parsed.default === "string") return parsed.default;
    return Object.values(parsed).find((value) => typeof value === "string") ?? null;
  } catch {
    return null;
  }
}

function validTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function validDateKey(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: headersFor(request) });
  if (request.method !== "POST") return reply(request, { error: "Método não permitido." }, 405);

  const origin = request.headers.get("Origin");
  const allowedOrigin = Deno.env.get("CORS_ORIGIN") ?? DEFAULT_ORIGIN;
  if (origin && origin !== allowedOrigin && origin !== "http://localhost:3000") {
    return reply(request, { error: "Origem não autorizada." }, 403);
  }

  const accessToken = (request.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publicKey = publishableKey();
  const adminKey = secretKey();
  if (!projectUrl || !publicKey || !adminKey || !accessToken) return reply(request, { error: "Sessão Supabase necessária." }, 401);

  const userClient = createClient(projectUrl, publicKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(accessToken);
  if (authError || !authData.user) return reply(request, { error: "Sessão inválida ou expirada." }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return reply(request, { error: "JSON inválido." }, 400);
  }

  const admin = createClient(projectUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date();
  if (payload.enabled === false) {
    const { error } = await admin.rpc("replace_weekly_push_reminders", { p_user_id: authData.user.id, p_rows: [] });
    if (error) return reply(request, { error: "Não foi possível cancelar os lembretes futuros." }, 500);
    return reply(request, { ok: true, scheduled: 0, cancelled: true });
  }

  if (payload.enabled !== true || !Array.isArray(payload.entries) || payload.entries.length > 7 || !validTimeZone(payload.timeZone)) {
    return reply(request, { error: "Configuração de lembretes inválida." }, 400);
  }

  const { data: subscriptions, error: subscriptionError } = await admin.from("web_push_subscriptions")
    .select("id, categories")
    .eq("user_id", authData.user.id)
    .eq("active", true);
  if (subscriptionError) return reply(request, { error: "Não foi possível verificar a inscrição push." }, 500);
  if (!(subscriptions ?? []).some((row: { categories?: Record<string, boolean> }) => row.categories?.weeklyPlan === true)) {
    const { error: cancelError } = await admin.rpc("replace_weekly_push_reminders", { p_user_id: authData.user.id, p_rows: [] });
    if (cancelError) return reply(request, { error: "Não foi possível cancelar a fila de lembretes." }, 500);
    return reply(request, { error: "Ative notificações push com a categoria de roteiro semanal no Perfil antes de agendar." }, 409);
  }

  const seenDates = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  for (const candidate of payload.entries as Entry[]) {
    if (!candidate || typeof candidate !== "object" || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.dateKey) ||
        typeof candidate.activityId !== "string" || !ACTIVITIES[candidate.activityId] || typeof candidate.scheduledAt !== "string") {
      return reply(request, { error: "Uma atividade planejada não passou na validação." }, 400);
    }
    if (!validDateKey(candidate.dateKey)) return reply(request, { error: "A data do lembrete não existe no calendário." }, 400);
    if (seenDates.has(candidate.dateKey)) return reply(request, { error: "Há mais de uma atividade para o mesmo dia." }, 400);
    seenDates.add(candidate.dateKey);
    const scheduled = new Date(candidate.scheduledAt);
    if (!Number.isFinite(scheduled.getTime()) || scheduled.toISOString() !== candidate.scheduledAt || scheduled <= now ||
        scheduled.getTime() > now.getTime() + 7 * 24 * 60 * 60 * 1000) {
      return reply(request, { error: "O horário deve estar nos próximos sete dias." }, 400);
    }
    if (dateInTimeZone(scheduled, payload.timeZone as string) !== candidate.dateKey) {
      return reply(request, { error: "A data não corresponde ao horário e fuso enviados." }, 400);
    }
    const activity = ACTIVITIES[candidate.activityId];
    rows.push({
      user_id: authData.user.id,
      activity_date: candidate.dateKey,
      activity_id: candidate.activityId,
      category: "weeklyPlan",
      title: "Lembrete Treino Plus",
      body: `Você planejou ${activity.label} para hoje. Toque para abrir seu roteiro.`,
      target_url: `${APP_ORIGIN}${APP_BASE_PATH}${activity.path}`,
      scheduled_at: scheduled.toISOString(),
      time_zone: payload.timeZone,
      status: "pending",
      attempts: 0,
      next_attempt_at: null,
      claimed_at: null,
      sent_at: null,
      last_error: null,
    });
  }

  const { error: syncError } = await admin.rpc("replace_weekly_push_reminders", { p_user_id: authData.user.id, p_rows: rows });
  if (syncError) return reply(request, { error: "Não foi possível salvar a agenda de lembretes." }, 500);
  return reply(request, { ok: true, scheduled: rows.length });
});
