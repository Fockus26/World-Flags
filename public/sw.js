const CACHE_NAME = "banderas-cache-v3";
const OFFLINE_URL = "/";

// Sin `skipWaiting()` automático a propósito: así el service worker nuevo se
// queda "esperando" (`registration.waiting`) en vez de tomar el control de
// golpe, y la app puede ofrecer el botón "Actualizar" (ver
// `useServiceWorkerUpdate.ts`) en vez de recargar sin avisar. Solo salta a
// activarse cuando ese botón manda el mensaje de abajo.
self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
});

self.addEventListener("message", (event) => {
	if (event.data?.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});

// Recordatorio diario: la Edge Function `send-daily-reminders` manda un push
// con `{ title, body }` en el payload JSON.
self.addEventListener("push", (event) => {
	let payload = { title: "World Flags", body: "Tienes un recordatorio nuevo." };

	try {
		if (event.data) payload = { ...payload, ...event.data.json() };
	} catch {
		// Payload no-JSON: se queda el genérico de arriba.
	}

	event.waitUntil(
		self.registration.showNotification(payload.title, {
			body: payload.body,
			icon: "/pwa-192x192.png",
			badge: "/pwa-192x192.png",
			tag: "daily-reminder",
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	event.waitUntil(
		self.clients.matchAll({ type: "window" }).then((clientList) => {
			for (const client of clientList) {
				if ("focus" in client) return client.focus();
			}
			return self.clients.openWindow("/");
		}),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
			),
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;

	// Navegación (el HTML de la app): siempre se intenta la red primero, para
	// que abrir la PWA instalada cargue la última versión (con las últimas
	// referencias a los bundles con hash) en vez de quedarse pegada
	// indefinidamente a una versión vieja cacheada. Solo cae al cache/offline
	// si no hay red.
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return response;
				})
				.catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))),
		);
		return;
	}

	event.respondWith(
		caches.match(request).then((cached) => {
			const network = fetch(request)
				.then((response) => {
					if (response.ok && request.url.startsWith(self.location.origin)) {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return response;
				})
				.catch(() => cached || caches.match(OFFLINE_URL));
			return cached || network;
		}),
	);
});
