import { createClient } from "npm:@supabase/supabase-js@2.116.0";

type Categories = { workouts: boolean; weeklyPlan: boolean; achievements: boolean; lives: boolean };
const DEFAULT_CATEGORIES: Categories = { workouts: true, weeklyPlan: true, achievements: false, lives: false };
const DEFAULT_ORIGIN = "https://saulopassos00.github.io";
const PUSH_HOSTS = ["fcm.googleapis.com", "push.services.mozilla.com", "updates.push.services.mozilla.com", "web.push.apple.com", "push.apple.com"];

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

function reply(request: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: headersFor(request) });
}

function isAllowedEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096) return false;
  try {
    const url = new URL(value);
    const hostAllowed = PUSH_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") && hostAllowed;
  } catch {
    return false;
  }
}

function readCategories(value: unknown): Categories | null {
  if (value === undefined || value === null) return DEFAULT_CATEGORIES;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const keys = Object.keys(DEFAULT_CATEGORIES) as (keyof Categories)[];
  if (Object.keys(input).some((key) => !keys.includes(key as keyof Categories))) return null;
  const output = { ...DEFAULT_CATEGORIES };
  for (const key of keys) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== "boolean") return null;
      output[key] = input[key] as boolean;
    }
  }
  return output;
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

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: headersFor(request) });
  if (request.method !== "POST") return reply(request, { error: "Método não permitido." }, 405);

  const origin = request.headers.get("Origin");
  const allowedOrigin = Deno.env.get("CORS_ORIGIN") ?? DEFAULT_ORIGIN;
  if (origin && origin !== allowedOrigin && origin !== "http://localhost:3000") {
    return reply(request, { error: "Origem não autorizada." }, 403);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = Deno.env.get("SUPABASE_URL");
  const key = publishableKey();
  if (!url || !key || !accessToken) return reply(request, { error: "Sessão Supabase necessária." }, 401);

  const userClient = createClient(url, key, {
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

  if (payload.action === "delete") {
    if (!isAllowedEndpoint(payload.endpoint)) return reply(request, { error: "Endpoint push inválido." }, 400);
    const { error } = await userClient.from("web_push_subscriptions")
      .delete()
      .eq("user_id", authData.user.id)
      .eq("endpoint", payload.endpoint);
    if (error) return reply(request, { error: "Não foi possível remover a inscrição." }, 500);
    return reply(request, { ok: true, action: "deleted" });
  }

  if (payload.action !== "upsert") return reply(request, { error: "Ação inválida." }, 400);
  const subscription = payload.subscription as { endpoint?: unknown; keys?: unknown } | null;
  if (!subscription || !isAllowedEndpoint(subscription.endpoint)) return reply(request, { error: "Endpoint push inválido." }, 400);
  if (!subscription.keys || typeof subscription.keys !== "object" || Array.isArray(subscription.keys)) {
    return reply(request, { error: "Chaves da inscrição ausentes." }, 400);
  }
  const keys = subscription.keys as Record<string, unknown>;
  if (typeof keys.p256dh !== "string" || !/^[A-Za-z0-9_-]{80,120}$/.test(keys.p256dh) ||
      typeof keys.auth !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(keys.auth)) {
    return reply(request, { error: "Formato das chaves da inscrição inválido." }, 400);
  }
  const categories = readCategories(payload.categories);
  if (!categories) return reply(request, { error: "Preferências de categorias inválidas." }, 400);
  const timeZone = validTimeZone(payload.timeZone) ? payload.timeZone : "America/Sao_Paulo";

  const { error } = await userClient.from("web_push_subscriptions").upsert({
    user_id: authData.user.id,
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth_key: keys.auth,
    categories,
    time_zone: timeZone,
    active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) return reply(request, { error: "Não foi possível salvar a inscrição no banco." }, 500);
  return reply(request, { ok: true, action: "saved" }, 201);
});
