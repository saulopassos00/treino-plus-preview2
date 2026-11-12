"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = "BOnuSxClLfPgbRUuNDZpcov3KhuUGKUTXOgN0PE8_Qf4SrnKuzS1RjNgfACF0pnszC54DzeHRzYo8Ci9XO5s-Oo";
const APP_BASE_PATH = "/treino-plus-preview2";
const STORAGE_KEY = "treino-plus-webpush-v1";

type PushPreferences = {
  subscription: PushSubscriptionJSON | null;
  categories: { workouts: boolean; weeklyPlan: boolean; achievements: boolean; lives: boolean };
};

const DEFAULT_PREFERENCES: PushPreferences = {
  subscription: null,
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<PushPreferences>;
    return {
      subscription: parsed.subscription ?? null,
      categories: { ...DEFAULT_PREFERENCES.categories, ...(parsed.categories ?? {}) },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function PushNotificationSettings() {
  const [preferences, setPreferences] = useState<PushPreferences>(DEFAULT_PREFERENCES);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    setMounted(true);
    setPreferences(loadPreferences());
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  function save(next: PushPreferences) {
    setPreferences(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* preferência permanece nesta sessão */ }
  }

  async function enablePush() {
    if (!mounted || busy) return;
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
      // A permissão é solicitada somente após ação explícita do usuário.
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
      save({ ...preferences, subscription: subscription.toJSON() });
      setMessage("Permissão concedida e inscrição do navegador criada. O envio real permanece indisponível até conectar um servidor seguro de inscrições e notificações.");
    } catch (error) {
      setMessage(error instanceof Error ? `Não foi possível ativar agora: ${error.message}` : "Não foi possível ativar as notificações neste navegador.");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration(`${APP_BASE_PATH}/`);
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();
      save({ ...preferences, subscription: null });
      setMessage("Inscrição removida deste navegador. Se necessário, revogue a permissão nas configurações do navegador.");
    } catch {
      setMessage("Não foi possível remover a inscrição neste momento.");
    } finally {
      setBusy(false);
    }
  }

  function toggleCategory(category: keyof PushPreferences["categories"]) {
    save({ ...preferences, categories: { ...preferences.categories, [category]: !preferences.categories[category] } });
  }

  const options: { key: keyof PushPreferences["categories"]; label: string }[] = [
    { key: "workouts", label: "Lembretes de treinos" },
    { key: "weeklyPlan", label: "Mudanças no roteiro semanal" },
    { key: "achievements", label: "Metas e conquistas" },
    { key: "lives", label: "Lives e novas gravações" },
  ];

  return (
    <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#007AFF]">Preferências</p>
      <h2 className="mt-1 text-lg font-bold">Notificações push</h2>
      <p className="mt-1 text-sm leading-relaxed text-neutral-500">Escolha quais avisos gostaria de receber. O navegador só pede permissão após você tocar no botão.</p>

      <fieldset className="mt-4 space-y-2" disabled={!mounted || busy}>
        <legend className="mb-2 text-xs font-semibold text-neutral-600">Tipos de aviso</legend>
        {options.map((option) => <label key={option.key} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 text-sm">
          <input type="checkbox" checked={preferences.categories[option.key]} onChange={() => toggleCategory(option.key)} className="h-4 w-4 accent-[#007AFF]" />
          {option.label}
        </label>)}
      </fieldset>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
        <strong>Integração incompleta:</strong> esta versão pode pedir permissão e criar a inscrição do navegador. Ela ainda não envia a inscrição a um servidor nem agenda envios, então você ainda não receberá lembretes push reais. As preferências e a inscrição ficam neste navegador.
      </div>
      {permission === "unsupported" && mounted && <p className="mt-2 text-xs text-neutral-500">Seu navegador não expõe a API de notificações. No iPhone/iPad, Web Push requer iOS/iPadOS 16.4 ou posterior e o app adicionado à Tela de Início.</p>}
      <p className="mt-3 text-xs text-neutral-500">Status neste navegador: {!mounted ? "carregando" : permission === "granted" && preferences.subscription ? "permissão concedida · inscrição local" : permission === "denied" ? "bloqueada nas configurações do navegador" : permission === "granted" ? "permissão concedida, sem inscrição" : "não ativada"}</p>
      {message && <p role="status" className="mt-3 rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-950">{message}</p>}

      <div className="mt-4 flex gap-2">
        {!preferences.subscription ? <button type="button" disabled={!mounted || busy} onClick={enablePush} className="flex-1 rounded-xl bg-[#007AFF] py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Ativando…" : "Ativar notificações"}</button> : <button type="button" disabled={busy} onClick={disablePush} className="flex-1 rounded-xl bg-neutral-100 py-3 text-sm font-semibold text-neutral-800 disabled:opacity-50">{busy ? "Atualizando…" : "Remover inscrição"}</button>}
      </div>
    </section>
  );
}
