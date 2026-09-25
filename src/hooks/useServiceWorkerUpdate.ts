import { useEffect, useState } from "react";

/**
 * Detecta cuando hay un service worker nuevo instalado y esperando (ver
 * `public/sw.js`: ya no llama a `skipWaiting()` solo). Expone `applyUpdate`
 * para que la UI decida cuándo activarlo, en vez de tomar el control de
 * golpe y servir un bundle nuevo a media sesión.
 */
export function useServiceWorkerUpdate() {
	const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
		null,
	);

	useEffect(() => {
		if (!("serviceWorker" in navigator)) return;

		function watchInstalling(installing: ServiceWorker | null) {
			if (!installing) return;

			installing.addEventListener("statechange", () => {
				// Sin `serviceWorker.controller` es la primera instalación (no
				// hay versión anterior de la que "actualizar"): no hace falta
				// ofrecer el botón, el propio `install` ya deja todo listo.
				if (
					installing.state === "installed" &&
					navigator.serviceWorker.controller
				) {
					setWaitingWorker(installing);
				}
			});
		}

		navigator.serviceWorker.getRegistration().then((reg) => {
			if (!reg) return;

			if (reg.waiting && navigator.serviceWorker.controller) {
				setWaitingWorker(reg.waiting);
			}

			reg.addEventListener("updatefound", () =>
				watchInstalling(reg.installing),
			);
		});

		// Solo recarga un cambio que *reemplaza* a un controlador anterior (el
		// botón "Actualizar" de esta pestaña o de otra). En la primera visita
		// la página arranca sin controlador y el `clients.claim()` de
		// `sw.js` también dispara `controllerchange`, pero ahí no hay versión
		// vieja: recargar solo haría perder lo que el usuario empezara. Se
		// sigue el controlador en vivo, no el del montaje, para que tras esa
		// primera toma un "Actualizar" en la misma sesión sí recargue.
		let controller = navigator.serviceWorker.controller;
		let reloaded = false;
		function handleControllerChange() {
			const previous = controller;
			controller = navigator.serviceWorker.controller;
			if (!previous) return;

			// `controllerchange` puede dispararse más de una vez en teoría;
			// una sola recarga evita un bucle.
			if (reloaded) return;
			reloaded = true;
			window.location.reload();
		}

		navigator.serviceWorker.addEventListener(
			"controllerchange",
			handleControllerChange,
		);

		return () => {
			navigator.serviceWorker.removeEventListener(
				"controllerchange",
				handleControllerChange,
			);
		};
	}, []);

	const applyUpdate = () => {
		waitingWorker?.postMessage({ type: "SKIP_WAITING" });
	};

	return {
		updateAvailable: waitingWorker !== null,
		applyUpdate,
		forceUpdate,
	};
}

/**
 * Tope para cada espera de `forceUpdate` (bajar `sw.js` e instalarlo, o que
 * el worker nuevo tome el control). Pasado, se recarga igual.
 */
const FORCE_UPDATE_STEP_MS = 5_000;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resuelve cuando el worker queda instalado (o falla, o pasa el tope). */
function waitUntilInstalled(worker: ServiceWorker | null): Promise<void> {
	if (worker?.state !== "installing") return Promise.resolve();

	return Promise.race([
		new Promise<void>((resolve) => {
			worker.addEventListener("statechange", () => {
				if (worker.state !== "installing") resolve();
			});
		}),
		delay(FORCE_UPDATE_STEP_MS),
	]);
}

/**
 * "Actualizar" de la actualización obligatoria (D111): a diferencia de
 * `applyUpdate`, no espera a que el navegador haya encontrado el SW nuevo.
 *
 * 1. Si no hay uno esperando, se le pide al navegador que lo busque ya
 *    (`registration.update()`) y se espera a que se instale.
 * 2. Con uno esperando y la página controlada, se activa (`SKIP_WAITING`):
 *    el `controllerchange` de arriba recarga esta pestaña y las demás.
 * 3. En cualquier otro caso (sin SW, sin registro, sin red, sin versión
 *    nueva de `sw.js`), se recarga sin más: la navegación va siempre a la red
 *    primero (`sw.js`), así que la recarga trae el HTML y el bundle nuevos.
 *
 * Si tras activar el worker la recarga no llega (p. ej. otra pestaña ya lo
 * había activado y no hubo `controllerchange` aquí), se recarga a mano.
 */
async function forceUpdate(): Promise<void> {
	if ("serviceWorker" in navigator) {
		try {
			const registration = await navigator.serviceWorker.getRegistration();

			if (registration && !registration.waiting) {
				await Promise.race([
					registration.update(),
					delay(FORCE_UPDATE_STEP_MS),
				]);
				await waitUntilInstalled(registration.installing);
			}

			if (registration?.waiting && navigator.serviceWorker.controller) {
				registration.waiting.postMessage({ type: "SKIP_WAITING" });
				await delay(FORCE_UPDATE_STEP_MS);
			}
		} catch {
			// Sin red o sin permiso para el SW: basta con recargar.
		}
	}

	window.location.reload();
}
