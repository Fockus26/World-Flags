import { countries } from "@/data/countries";

/** Lo que usamos de la Network Information API (no está en los tipos del DOM). */
interface ConnectionInfo {
	saveData?: boolean;
	effectiveType?: string;
}

/**
 * ¿Merece la pena precargar ahora (~3,1 MB)? No, si el usuario pidió ahorrar
 * datos o la conexión es 2G: ahí se queda como antes, con las banderas que ya
 * vio. Sin la API (Safari, Firefox) se precarga: es lo que eligió el dueño.
 */
export function shouldPrecacheFlags(
	connection: ConnectionInfo | undefined,
): boolean {
	if (!connection) return true;
	if (connection.saveData) return false;

	return (
		connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g"
	);
}

export function getFlagUrls(): string[] {
	return countries.map((country) => `/flags/${country.code}.svg`);
}

/**
 * Pide al service worker que guarde en caché las banderas que le falten
 * (D054), para poder practicar sin red cualquier continente, también los que
 * nunca se abrieron. El SW solo descarga las que no tiene, así que llamarla en
 * cada carga es barato. Sin service worker no hace nada.
 */
export async function requestFlagPrecache(): Promise<void> {
	if (!("serviceWorker" in navigator) || !navigator.onLine) return;

	const { connection } = navigator as Navigator & {
		connection?: ConnectionInfo;
	};

	if (!shouldPrecacheFlags(connection)) return;

	const registration = await navigator.serviceWorker.ready;

	registration.active?.postMessage({
		type: "PRECACHE_FLAGS",
		urls: getFlagUrls(),
	});
}
