// Screen Wake Lock API helper to prevent mobile screen sleep during workouts and lives

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
};

let activeLock: WakeLockSentinel | null = null;
let keepActive = false;

async function acquireLock() {
  if (typeof window === "undefined" || !("wakeLock" in navigator)) return;
  try {
    const nav = navigator as unknown as {
      wakeLock: {
        request: (type: "screen") => Promise<WakeLockSentinel>;
      };
    };
    activeLock = await nav.wakeLock.request("screen");
    activeLock.addEventListener("release", () => {
      activeLock = null;
    });
  } catch {
    /* Pode falhar em economia de bateria ou abas em background */
    activeLock = null;
  }
}

function handleVisibilityChange() {
  if (keepActive && document.visibilityState === "visible") {
    acquireLock();
  }
}

export function requestScreenWakeLock(): () => void {
  if (typeof window === "undefined") return () => {};

  keepActive = true;
  acquireLock();

  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Retorna função de limpeza
  return () => {
    keepActive = false;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (activeLock) {
      activeLock.release().catch(() => {});
      activeLock = null;
    }
  };
}
