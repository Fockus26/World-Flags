import { useEffect } from "react";

import { requestFlagPrecache } from "@/utils/flag-precache";

/**
 * Espera antes de pedir la precarga: la primera carga (bundle, datos, la
 * bandera de la sesión) va primero y ~3 MB de banderas no compiten con ella.
 */
const PRECACHE_DELAY_MS = 5_000;

/**
 * Precarga de las 197 banderas para jugar sin conexión (D054). Se pide una
 * vez por carga, tras `PRECACHE_DELAY_MS`, y otra vez al volver la red por si
 * la anterior se cortó. El service worker solo descarga las que le faltan.
 */
export function FlagPrecacheEffects() {
	useEffect(() => {
		const request = () => void requestFlagPrecache();

		const timeoutId = setTimeout(request, PRECACHE_DELAY_MS);

		window.addEventListener("online", request);

		return () => {
			clearTimeout(timeoutId);
			window.removeEventListener("online", request);
		};
	}, []);

	return null;
}
