"use client";

import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = "BOnuSxClLfPgbRUuNDZpcov3KhuUGKUTXOgN0PE8_Qf4SrnKuzS1RjNgfACF0pnszC54DzeHRzYo8Ci9XO5s-Oo";
const APP_BASE_PATH = "/treino-plus-preview2";
const STORAGE_KEY = "treino-plus-webpush-preferences-v2";
const LEGACY_STORAGE_KEY = "treino-plus-webpush-v1";

type Categories = { workouts: boolean; weeklyPlan: boolean; achievements: boolean; lives: boolean };
type PushPreferences = { categories: Categories };

const DEFAULT_PREFERENCES: PushPreferences = {
  categories: { workouts: true, weeklyPlan: true, achievements: false, lives: false },
};

function decodeVapidKey(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function loadPreferences(): PushPreferences {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = JSON.parse(current ?? legacy ?? "{}") as { categories?: Partial<Categories> };
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return { categories: { ...DEFAULT_PREFERENCES.categories, ...(parsed.categories ?? {}) } };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function validCategories(value: Categories): Categories {
  return {
    workouts: Boolean(value.workouts),
    weeklyPlan: Boolean(value.weeklyPlan),
    achievements: Boolean(value.achievements),
    lives: Boolean(value.lives),
  };
}

export function PushNotificationSettings() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [preferences, setPreferences] = useState<PushPreferences>(DEFAULT_PREFERENCES);
  const [mounted, setMounted] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [message, setMessage] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    const supabase = createBrowserClient();
    setClient(supabase);
    setConfigured(Boolean(supabase));
    setPreferences(loadPreferences());
    setPermission("Notification" in window ? Notification.permission : "unsupported");
    setMounted(true);

    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage("Não foi possível restaurar a sessão do Supabase. Tente entrar novamente.");
      setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setMagicLinkSent(false);
    });
    void navigator.serviceWorker?.getRegistration(`${APP_BASE_PATH}/`).then(async (registration) => {
      const current = await registration?.pushManager.getSubscription();
      if (active) setHasSubscription(Boolean(current));
    }).catch(() => undefined);

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!client || !session?.user.id || !mounted || !hasSubscription) return;
    let cancelled = false;
    void (async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration(`${APP_BASE_PATH}/`);
        const subscription = await registration?.pushManager.getSubscription();
        if (!subscription) {
          if (!cancelled) setHasSubscription(false);
          return;
        }
        const { error } = await client.functions.invoke("push-subscriptions", {
          body: {
            action: "upsert",
            subscription: subscription.toJSON(),
            categories: validCategories(preferences.categories),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
          },
        });
        if (error && !cancelled) setMessage(`A inscrição existe neste navegador, mas não sincronizou com o banco: ${error.message}`);
      } catch {
        if (!cancelled) setMessage("Não foi possível sincronizar a inscrição com o Supabase. Verifique as Edge Functions.");
      }
    })();
    return () => { cancelled = true; };
  }, [client, session?.user.id, mounted, hasSubscription, preferences.categories]);

  function save(next: PushPreferences) {
    setPreferences(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Preferências ainda ficam na sessão atual. */ }
  }

  async function sendMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !email.trim() || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const redirectTo = `${window.location.origin}${APP_BASE_PATH}/account/`;
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (error) throw error;
      setMagicLinkSent(true);
      setMessage("Link de acesso enviado. Abra o e-mail neste dispositivo para concluir a autenticação.");
    } catch (error) {
      setMessage(error instanceof Error ? `Não foi possível enviar o link: ${error.message}` : "Não foi possível enviar o link de acesso.");
    } finally {
      setBusy(false);
    }
  }

  async function enablePush() {
    if (!client || !session?.user || !mounted || busy) {
      setMessage(!configured ? "O Supabase ainda não está configurado neste build. Veja as instruções de implantação." : "Entre com seu e-mail antes de ativar as notificações push.");
      return;
    }
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setMessage("Este navegador não oferece Web Push. Experimente um navegador compatível em HTTPS.");
      return;
    }
    const isAppleHomeScreen = /iphone|ipad|ipod/i.test(navigator.userAgent) && !("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);
    if (isAppleHomeScreen) {
      setMessage("No iPhone ou iPad, adicione o Treino Plus à Tela de Início e abra o ícone instalado antes de ativar notificações.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const granted = Notification.permission === "granted" || await Notification.requestPermission() === "granted";
      setPermission(Notification.permission);
      if (!granted) {
        setMessage("Permissão não concedida. Você pode alterá-la nas configurações do navegador.");
        return;
      }
      const registration = await navigator.serviceWorker.register(`${APP_BASE_PATH}/sw.js`, { scope: `${APP_BASE_PATH}/` });
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(VAPID_PUBLIC_KEY) as BufferSource,
        });
      }
      const { error } = await client.functions.invoke("push-subscriptions", {
        body: {
          action: "upsert",
          subscription: subscription.toJSON(),
          categories: validCategories(preferences.categories),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
        },
      });
      if (error) {
        await subscription.unsubscribe();
        throw new Error(`Não foi possível salvar a inscrição no Supabase: ${error.message}`);
      }
      setHasSubscription(true);
      setPermission(Notification.permission);
      setMessage("Notificações ativadas e inscrição salva na sua conta Supabase.");
    } catch (error) {
      setHasSubscription(false);
      setMessage(error instanceof Error ? error.message : "Não foi possível ativar as notificações neste navegador.");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    if (!client || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration(`${APP_BASE_PATH}/`);
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription && session?.user) {
        const { error } = await client.functions.invoke("push-subscriptions", {
          body: { action: "delete", endpoint: subscription.endpoint },
        });
        if (error) throw new Error(`Não foi possível remover a inscrição do banco: ${error.message}`);
      }
      await subscription?.unsubscribe();
      setHasSubscription(false);
      setMessage("Inscrição removida deste navegador e, se havia sessão, do banco Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível remover a inscrição neste momento.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!client || busy) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration(`${APP_BASE_PATH}/`);
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const { error } = await client.functions.invoke("push-subscriptions", {
          body: { action: "delete", endpoint: subscription.endpoint },
        });
        if (error) throw new Error(`Remova a inscrição push antes de sair: ${error.message}`);
        await subscription.unsubscribe();
        setHasSubscription(false);
      }
      const { error } = await client.auth.signOut();
      if (error) throw error;
      setSession(null);
      setMessage("Sessão Supabase encerrada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível encerrar a sessão.");
    } finally {
      setBusy(false);
    }
  }

  function toggleCategory(category: keyof Categories) {
    save({ categories: { ...preferences.categories, [category]: !preferences.categories[category] } });
  }

  const options: { key: keyof Categories; label: string }[] = [
    { key: "workouts", label: "Lembretes de treinos" },
    { key: "weeklyPlan", label: "Mudanças no roteiro semanal" },
    { key: "achievements", label: "Metas e conquistas" },
    { key: "lives", label: "Lives e novas gravações" },
  ];

  return (
    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#007AFF]">Preferências</p>
      <h2 className="mt-1 text-lg font-bold">Notificações push</h2>
      <p className="mt-1 text-sm leading-relaxed text-neutral-500">Entre com um link enviado por e-mail. Essa autenticação Supabase serve para associar a inscrição push à sua conta; login e compras do restante desta demonstração continuam locais.</p>

      {!configured ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
          <strong>Supabase não configurado neste build.</strong> Defina as variáveis públicas <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no GitHub Actions e configure a URL de retorno do perfil no Supabase Auth.
        </div>
      ) : session?.user ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-blue-50 p-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-blue-800">Supabase Auth conectado</p>
            <p className="truncate text-sm font-semibold text-blue-950">{session.user.email}</p>
          </div>
          <button type="button" onClick={signOut} disabled={busy} className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-blue-900 disabled:opacity-50">Sair</button>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="mt-4 rounded-2xl bg-neutral-50 p-3">
          <label className="block text-xs font-medium text-neutral-600" htmlFor="push-auth-email">E-mail da conta Supabase</label>
          <input id="push-auth-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#007AFF]" />
          <button type="submit" disabled={!client || busy} className="mt-2 w-full rounded-xl bg-[#007AFF] py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Enviando…" : magicLinkSent ? "Reenviar link de acesso" : "Enviar link de acesso"}</button>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">O link expira conforme a política do Supabase Auth. Em produção, configure um provedor de e-mail transacional.</p>
        </form>
      )}

      <fieldset className="mt-4 space-y-2" disabled={!mounted || busy}>
        <legend className="mb-2 text-xs font-semibold text-neutral-600">Tipos de aviso</legend>
        {options.map((option) => <label key={option.key} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 text-sm">
          <input type="checkbox" checked={preferences.categories[option.key]} onChange={() => toggleCategory(option.key)} className="h-4 w-4 accent-[#007AFF]" />
          {option.label}
        </label>)}
      </fieldset>
      <p className="mt-2 text-xs leading-relaxed text-neutral-500">Nesta etapa, o envio automático conectado é o lembrete do roteiro semanal. Treinos, conquistas e lives são preferências salvas, mas ainda não têm disparadores de evento ativos.</p>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
        <strong>Envio real depende do backend:</strong> com sessão válida, a subscription e as categorias são enviadas à Edge Function autenticada e persistidas no Supabase. A chave privada VAPID permanece apenas nos secrets do servidor; lembretes exigem também a fila e o cron configurados.
      </div>
      {permission === "unsupported" && mounted && <p className="mt-2 text-xs text-neutral-500">Seu navegador não expõe a API de notificações. No iPhone/iPad, Web Push requer iOS/iPadOS 16.4 ou posterior e o app adicionado à Tela de Início.</p>}
      <p className="mt-3 text-xs text-neutral-500">Status neste navegador: {!mounted ? "carregando" : permission === "granted" && hasSubscription ? session?.user ? "permissão concedida · inscrição no Supabase" : "inscrição local · entre para associar à conta" : permission === "denied" ? "bloqueada nas configurações do navegador" : permission === "granted" ? "permissão concedida, sem inscrição" : "não ativada"}</p>
      {message && <p role="status" className="mt-3 rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-950">{message}</p>}

      <div className="mt-4 flex gap-2">
        {!hasSubscription ? <button type="button" disabled={!mounted || busy || !client || !session?.user} onClick={enablePush} className="flex-1 rounded-xl bg-[#007AFF] py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Ativando…" : "Ativar notificações"}</button> : <button type="button" disabled={busy} onClick={disablePush} className="flex-1 rounded-xl bg-neutral-100 py-3 text-sm font-semibold text-neutral-800 disabled:opacity-50">{busy ? "Atualizando…" : "Remover inscrição"}</button>}
      </div>
    </section>
  );
}
