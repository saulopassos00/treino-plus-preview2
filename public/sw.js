/* Treino Plus Web Push client handler. Server-side delivery is not connected yet. */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "Abra o Treino Plus para ver as novidades." };
  }

  const title = typeof payload.title === "string" ? payload.title : "Treino Plus";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "Você tem uma atualização no seu roteiro.",
    icon: "/treino-plus-preview2/icons/icon-192.svg",
    badge: "/treino-plus-preview2/icons/icon-192.svg",
    data: { url: typeof payload.url === "string" ? payload.url : "/treino-plus-preview2/semana/" },
    tag: typeof payload.tag === "string" ? payload.tag : "treino-plus-update",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || "/treino-plus-preview2/semana/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin + "/treino-plus-preview2/") && "focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(destination);
        return;
      }
    }
    await self.clients.openWindow(destination);
  })());
});
