const CACHE_NAME = "banderas-cache-v2";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
	self.skipWaiting();
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
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
