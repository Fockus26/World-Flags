import { useAppSelector } from "@/store/hooks";

/**
 * Estado de carga del progreso, para la UI (D042).
 *
 * `isInitialLoad` es `true` desde que abre la página hasta que llega el
 * primer dato a la pantalla: la hidratación del invitado, la sincronización
 * de la cuenta o, si Supabase Auth no responde, el fallback de
 * `localStorage` a los 2.5 s (`hydrationStatus` `local`). Así nunca se queda
 * en `true` con la red caída.
 *
 * Solo cubre la carga inicial: un login posterior, o la sincronización que
 * llega después del fallback, reemplaza los datos en el sitio sin volver a
 * `true` — pasar de contenido a skeleton y de vuelta a contenido es peor que
 * un reemplazo directo.
 */
export function useHydration() {
	const hasHydratedOnce = useAppSelector((state) => state.game.hasHydratedOnce);

	return { isInitialLoad: !hasHydratedOnce };
}
