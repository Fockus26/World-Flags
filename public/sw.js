const CACHE_NAME = "banderas-cache-v4";
const OFFLINE_URL = "/";

// Versión de la app que trae este service worker: siempre la de
// `package.json` (lo exige `tests/unit/sw-version.test.ts`, D107). Así cada
// versión cambia al menos un byte de este archivo, el navegador instala un
// service worker nuevo y la app ofrece "Actualizar" a las pestañas abiertas
// con la anterior; si no, seguirían con el bundle viejo. Antes solo cambiaba
// cuando alguien se acordaba de tocar un comentario (la última vez, 1.2.0).
// `CACHE_NAME` no cambia a propósito: las banderas ya precargadas (D054)
// siguen valiendo.
const APP_VERSION = "2.4.2";

// Sin `skipWaiting()` automático a propósito: así el service worker nuevo se
// queda "esperando" (`registration.waiting`) en vez de tomar el control de
// golpe, y la app puede ofrecer el botón "Actualizar" (ver
// `useServiceWorkerUpdate.ts`) en vez de recargar sin avisar. Solo salta a
// activarse cuando ese botón manda el mensaje de abajo.
self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
});

// Solo banderas propias: el mensaje viene de la página, pero se valida igual.
const FLAG_URL_PATTERN = /^\/flags\/[a-z0-9-]+\.svg$/;

// Precarga de banderas (D054): la app manda la lista del catálogo y aquí se
// descargan una a una las que falten en caché. Idempotente: en cada carga
// solo se piden las que no están. Si una falla (sin red), se para y la
// próxima carga sigue donde quedó.
async function precacheFlags(urls) {
	const cache = await caches.open(CACHE_NAME);

	for (const url of urls) {
		if (await cache.match(url)) continue;

		try {
			await cache.add(url);
		} catch {
			return;
		}
	}
}

self.addEventListener("message", (event) => {
	if (event.data?.type === "SKIP_WAITING") {
		self.skipWaiting();
	}

	if (event.data?.type === "PRECACHE_FLAGS" && Array.isArray(event.data.urls)) {
		const urls = event.data.urls.filter(
			(url) => typeof url === "string" && FLAG_URL_PATTERN.test(url),
		);

		event.waitUntil(precacheFlags(urls));
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

	// Otros orígenes (Supabase, avatares de dicebear, Google Fonts): directo a
	// la red, sin pasar por aquí. Nunca se cacheaban, y responderles con la
	// página offline cuando no hay red hacía que un GET a Supabase recibiera
	// HTML con 200 en vez de un error de red: la app no podía saber que estaba
	// sin conexión. La caché HTTP del navegador sigue aplicando (un avatar ya
	// visto carga sin red).
	if (new URL(request.url).origin !== self.location.origin) return;

	event.respondWith(
		caches.match(request).then((cached) => {
			const network = fetch(request)
				.then((response) => {
					if (response.ok) {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return response;
				})
				// Un recurso que no está en caché y no llega (una bandera nunca
				// vista, sin red) falla como fallo de red, no con el HTML de la
				// app — que como imagen o script no sirve de nada.
				.catch(() => cached || Response.error());
			return cached || network;
		}),
	);
});
