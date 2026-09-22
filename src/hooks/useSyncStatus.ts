import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { requestSync } from "@/store/slices/syncSlice";

/**
 * Conexión y sincronización con la nube, para la UI (D050).
 *
 * - `isOnline`: hay conexión con el servidor. No es solo `navigator.onLine`:
 *   un fallo de red real lo pone en `false` aunque el navegador diga lo
 *   contrario.
 * - `hasPendingChanges`: hay progreso de la cuenta guardado solo en este
 *   dispositivo. Nunca se pierde por recargar o cerrar la app; sí por cerrar
 *   sesión (el logout borra los datos locales, D009).
 * - `hasServerError`: hay red, pero la sincronización falla en el servidor.
 * - `requestSync()`: pide sincronizar ya, sin esperar al agrupado de subidas.
 */
export function useSyncStatus() {
	const dispatch = useAppDispatch();

	const connectivity = useAppSelector((state) => state.sync.connectivity);
	const hasPendingChanges = useAppSelector(
		(state) => state.sync.hasPendingChanges,
	);
	const hasServerError = useAppSelector((state) => state.sync.hasServerError);
	const lastSyncedAt = useAppSelector((state) => state.sync.lastSyncedAt);

	return {
		isOnline: connectivity === "online",
		hasPendingChanges,
		hasServerError,
		lastSyncedAt,
		requestSync: () => dispatch(requestSync()),
	};
}
