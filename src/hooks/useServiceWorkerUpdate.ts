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

	return { updateAvailable: waitingWorker !== null, applyUpdate };
}
