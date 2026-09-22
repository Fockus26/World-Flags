import { useEffect } from "react";

import { store } from "@/store";

import { useAppDispatch } from "@/store/hooks";

import { requestSync, setConnectivity } from "@/store/slices/syncSlice";

/**
 * Sigue `navigator.onLine` y sus eventos (D050).
 *
 * - `offline` se cree al momento: sin red no hay petición que pueda salir.
 * - `online` no se cree a ciegas, porque miente a menudo (wifi sin salida a
 *   internet, portal cautivo). Con cuenta se pide una sincronización y su
 *   resultado decide (`GameEffects` despacha `syncSucceeded`/`syncFailed`);
 *   sin cuenta no hay nada con qué comprobarlo y se acepta tal cual.
 */
export function NetworkEffects() {
	const dispatch = useAppDispatch();

	useEffect(() => {
		dispatch(setConnectivity(navigator.onLine ? "online" : "offline"));

		const handleOffline = () => dispatch(setConnectivity("offline"));

		const handleOnline = () => {
			if (store.getState().auth.status === "authenticated") {
				dispatch(requestSync());
			} else {
				dispatch(setConnectivity("online"));
			}
		};

		window.addEventListener("offline", handleOffline);
		window.addEventListener("online", handleOnline);

		return () => {
			window.removeEventListener("offline", handleOffline);
			window.removeEventListener("online", handleOnline);
		};
	}, [dispatch]);

	return null;
}
