import { useSyncExternalStore } from "react";
import { getSoundEnabled, saveSoundEnabled } from "@/utils/learning-storage";

/**
 * Quién escucha los cambios de la preferencia en esta pestaña. `storage` solo
 * avisa a las OTRAS pestañas, así que el cambio hecho aquí se notifica a mano.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);

	// Otra pestaña de la app cambió el interruptor: se refleja aquí también.
	window.addEventListener("storage", listener);

	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", listener);
	};
}

/** Astro prerenderiza la isla sin `localStorage`: ahí vale el defecto. */
function getServerSnapshot() {
	return true;
}

/**
 * La preferencia "Sonidos" de este dispositivo (D081), para el interruptor de
 * la pestaña Juego. Quien reproduce (`utils/sound.ts`) la vuelve a leer en cada
 * sonido, así que apagarlo surte efecto al momento, sin recargar y sin que las
 * pantallas de partida tengan que suscribirse.
 */
export function useSoundPreference() {
	const soundEnabled = useSyncExternalStore(
		subscribe,
		getSoundEnabled,
		getServerSnapshot,
	);

	const setSoundEnabled = (enabled: boolean) => {
		saveSoundEnabled(enabled);

		for (const listener of listeners) listener();
	};

	return { soundEnabled, setSoundEnabled };
}
