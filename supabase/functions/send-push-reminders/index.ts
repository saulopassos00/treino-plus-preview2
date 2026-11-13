import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import webpush from "npm:web-push@3.6.7";

const APP_ORIGIN = "https://saulopassos00.github.io";
const APP_BASE_PATH = "/treino-plus-preview2";
const DEFAULT_ORIGIN = APP_ORIGIN;

type Reminder = {
  id: string;
  user_id: string;
  activity_id: string;
  category: "weeklyPlan";
  title: string;
  body: string;
  target_url: string;
  attempts: number;
};

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  categories: Record<string, boolean>;
};

type UnknownRecord = Record<string, unknown>;

function headersFor(request: Request): Record<string, string> {
  const allowed = Deno.env.get("CORS_ORIGIN") ?? DEFAULT_ORIGIN;
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin === allowed || origin === "http://localhost:3000" ? origin : allowed,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function reply(request: Request, body: UnknownRecord, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: headersFor(request) });
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

function constantTimeEquals(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

function isAllowedEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    const allowedHosts = ["fcm.googleapis.com", "push.services.mozilla.com", "updates.push.services.mozilla.com", "web.push.apple.com", "push.apple.com"];
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") &&
      allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function targetUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.origin === APP_ORIGIN && url.pathname.startsWith(`${APP_BASE_PATH}/`)) return url.href;
  } catch {
    // Use the weekly plan page as the safe fallback.
  }
  return `${APP_ORIGIN}${APP_BASE_PATH}/semana/`;
}

function statusCode(error: unknown): number {
  if (error && typeof error === "object" && "statusCode" in error && typeof (error as { statusCode?: unknown }).statusCode === "number") {
    return (error as { statusCode: number }).statusCode;
  }
  return 0;
}

function errorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : "Push delivery failed";
  return text.replace(/[\r\n]/g, " ").slice(0, 400);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: headersFor(request) });
  if (request.method !== "POST") return reply(request, { error: "Method not allowed." }, 405);

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || cronSecret.length < 32) return reply(request, { error: "Cron authentication is not configured." }, 503);
  const authorization = request.headers.get("Authorization") ?? "";
  const supplied = authorization.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
  if (!constantTimeEquals(supplied, cronSecret)) return reply(request, { error: "Unauthorized." }, 401);

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const adminKey = secretKey();
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  if (!projectUrl || !adminKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return reply(request, { error: "Push server configuration is incomplete." }, 503);
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch {
    return reply(request, { error: "VAPID configuration is invalid." }, 503);
  }

  const admin = createClient(projectUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: reminders, error: claimError } = await admin.rpc("claim_due_push_reminders", { p_limit: 50 });
  if (claimError) return reply(request, { error: "Could not claim due reminders." }, 500);

  let sent = 0;
  let skipped = 0;
  let retried = 0;
  const rows = (reminders ?? []) as Reminder[];

  for (const reminder of rows) {
    const { data: records, error: subscriptionError } = await admin.from("web_push_subscriptions")
      .select("id, endpoint, p256dh, auth_key, categories")
      .eq("user_id", reminder.user_id)
      .eq("active", true);
    if (subscriptionError) {
      const retry = reminder.attempts < 5;
      await admin.from("push_reminders").update({
        status: retry ? "pending" : "failed",
        next_attempt_at: retry ? new Date(Date.now() + 5 * 60_000).toISOString() : null,
        last_error: "Subscription lookup failed",
        claimed_at: null,
      }).eq("id", reminder.id);
      if (retry) retried++;
      continue;
    }

    const subscriptions = ((records ?? []) as SubscriptionRow[]).filter((row) => row.categories?.[reminder.category] === true);
    if (subscriptions.length === 0) {
      await admin.from("push_reminders").update({ status: "skipped", sent_at: new Date().toISOString(), claimed_at: null })
        .eq("id", reminder.id);
      skipped++;
      continue;
    }

    let delivered = 0;
    const errors: string[] = [];
    for (const subscription of subscriptions) {
      if (!isAllowedEndpoint(subscription.endpoint)) {
        await admin.from("web_push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("id", subscription.id);
        continue;
      }
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
        }, JSON.stringify({
          title: reminder.title,
          body: reminder.body,
          url: targetUrl(reminder.target_url),
          tag: reminder.id,
        }), { TTL: 3600 });
        delivered++;
      } catch (error) {
        const code = statusCode(error);
        if (code === 404 || code === 410) {
          await admin.from("web_push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("id", subscription.id);
        } else {
          errors.push(errorMessage(error));
        }
      }
    }

    if (delivered > 0) {
      await admin.from("push_reminders").update({ status: "sent", sent_at: new Date().toISOString(), claimed_at: null, last_error: null })
        .eq("id", reminder.id);
      sent++;
    } else if (errors.length > 0 && reminder.attempts < 5) {
      await admin.from("push_reminders").update({
        status: "pending",
        next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        claimed_at: null,
        last_error: errors.join("; ").slice(0, 400),
      }).eq("id", reminder.id);
      retried++;
    } else {
      await admin.from("push_reminders").update({
        status: errors.length > 0 ? "failed" : "skipped",
        sent_at: new Date().toISOString(),
        claimed_at: null,
        last_error: errors.length > 0 ? errors.join("; ").slice(0, 400) : null,
      }).eq("id", reminder.id);
      skipped++;
    }
  }

  return reply(request, { ok: true, claimed: rows.length, sent, skipped, retried });
});
