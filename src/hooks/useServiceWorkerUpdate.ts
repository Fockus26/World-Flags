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

		let reloaded = false;
		function handleControllerChange() {
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
