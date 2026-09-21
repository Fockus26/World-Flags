import { useEffect, useRef } from "react";

import { useAuth } from "@/hooks/useAuth";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { setHydrationStatus, setLearningData } from "@/store/slices/gameSlice";

import {
	pushLearningData,
	syncOnLogin,
	upsertLeaderboardEntry,
} from "@/utils/cloud-storage";

import {
	applyReviewsSince,
	clearLearningData,
	createDefaultLearningData,
	getLearningData,
	mergeLearningData,
} from "@/utils/learning-storage";

/**
 * Espera antes de cada reintento de una sincronización fallida (el último
 * valor se repite mientras siga fallando). Además se reintenta en cuanto
 * vuelve la red (`online`) y con cada evento de Supabase Auth (D044).
 */
const SYNC_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000];

/** Una sincronización de la cuenta falló y se juega en modo `local`. */
interface FailedSync {
	userId: string;
	/** Inicio del primer intento: lo revisado desde entonces es de esta cuenta (D046). */
	since: string;
	/** Fallos seguidos: elige la espera en `SYNC_RETRY_DELAYS_MS`. */
	failures: number;
}

export function GameEffects() {
	const dispatch = useAppDispatch();

	const learningData = useAppSelector((state) => state.game.learningData);

	const hydrationStatus = useAppSelector((state) => state.game.hydrationStatus);

	const { user, status } = useAuth();

	const hydratedUserRef = useRef<string | null>(null);

	/**
	 * Sobrevive a las re-ejecuciones del efecto de hidratación (`user` cambia
	 * de identidad con cada evento de Supabase Auth): distingue un reintento,
	 * que no vuelve a `loading` ni reemplaza los datos con los que ya se está
	 * jugando, de un primer intento.
	 */
	const failedSyncRef = useRef<FailedSync | null>(null);

	/** `status` del render anterior: distingue un logout real de un invitado normal. */
	const previousStatusRef = useRef<typeof status | null>(null);

	const pushTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	const pushedWorldBestRef = useRef<number | undefined>(undefined);

	const pushedCountriesWorldBestRef = useRef<number | undefined>(undefined);

	/**
	 * Hydrate guest/authenticated state.
	 *
	 * Guest:
	 *     localStorage -> Redux
	 *
	 * Authenticated:
	 *     localStorage + Supabase -> Redux
	 */
	/**
	 * Red de seguridad: si Supabase Auth no resuelve (red caída, mal
	 * configurado), `status` se queda en "loading" para siempre y el invitado
	 * ve su progreso vacío. Tras 2.5 s sin resolver, se hidrata desde
	 * localStorage igualmente (si luego llega la sesión, el efecto de abajo
	 * re-hidrata). No se toca `hydrationStatus` "ready" para no habilitar el
	 * push a Supabase antes de tiempo.
	 */
	useEffect(() => {
		if (status !== "loading") {
			return;
		}

		const timeoutId = setTimeout(() => {
			dispatch(setLearningData(getLearningData()));
		}, 2500);

		return () => clearTimeout(timeoutId);
	}, [status, dispatch]);

	useEffect(() => {
		if (status === "loading") {
			return;
		}

		const previousStatus = previousStatusRef.current;
		previousStatusRef.current = status;

		/**
		 * USER IS GUEST
		 */
		if (status === "guest") {
			clearTimeout(pushTimeoutRef.current);

			hydratedUserRef.current = null;

			failedSyncRef.current = null;

			/**
			 * Logout real (authenticated -> guest): mientras se estuvo
			 * autenticado las acciones del juego persistieron los datos del
			 * usuario en localStorage, así que hay que limpiarlos para que no
			 * queden disponibles para la sesión de invitado.
			 *
			 * Carga normal de invitado: NO se limpia — se hidrata desde
			 * localStorage para que el progreso del invitado (incluido el
			 * candado diario "practicado hoy") sobreviva a una recarga.
			 */
			if (previousStatus === "authenticated") {
				clearLearningData();
				dispatch(setLearningData(createDefaultLearningData()));
			} else {
				dispatch(setLearningData(getLearningData()));
			}

			dispatch(setHydrationStatus("ready"));

			return;
		}

		/**
		 * USER IS AUTHENTICATED
		 */
		if (
			status !== "authenticated" ||
			!user ||
			hydratedUserRef.current === user.id
		) {
			return;
		}

		let cancelled = false;

		let isSyncing = false;

		let retryTimeoutId: ReturnType<typeof setTimeout> | undefined;

		/**
		 * Aborta la sincronización en vuelo si el efecto se limpia (logout,
		 * otro usuario): una respuesta tardía ya no sube nada.
		 */
		const controller = new AbortController();

		const hydrateAuthenticatedUser = async () => {
			clearTimeout(pushTimeoutRef.current);

			clearTimeout(retryTimeoutId);

			const failedSync =
				failedSyncRef.current?.userId === user.id
					? failedSyncRef.current
					: null;

			const since = failedSync?.since ?? new Date().toISOString();

			// En un reintento ya se está jugando sobre los datos locales
			// (`local`): volver a `loading` no aportaría nada.
			if (!failedSync) {
				dispatch(setHydrationStatus("loading"));
			}

			isSyncing = true;

			/**
			 * Data stored locally before login.
			 *
			 * This is the guest data that may be transferred
			 * if the account has no existing progress.
			 */
			const localData = getLearningData();

			try {
				/**
				 * syncOnLogin:
				 *
				 * - account with progress -> remote wins
				 * - account without progress -> guest data transfers
				 */
				const syncedData = await syncOnLogin(
					user.id,
					localData,
					controller.signal,
				);

				if (cancelled) {
					return;
				}

				/**
				 * Lo jugado mientras la sincronización estaba en vuelo ya está
				 * en `localStorage` pero no en `syncedData`: reemplazar sin más
				 * lo borraría. Y lo revisado en modo `local` perdería contra la
				 * nube en `mergeLearningData` (D020) aunque sea de esta misma
				 * cuenta (D046).
				 */
				const latestLocalData = getLearningData();

				const mergedData =
					JSON.stringify(latestLocalData) === JSON.stringify(localData)
						? syncedData
						: mergeLearningData(syncedData, latestLocalData);

				const authenticatedData = applyReviewsSince(
					mergedData,
					latestLocalData,
					since,
				);

				failedSyncRef.current = null;

				/**
				 * IMPORTANT:
				 *
				 * Do not persist authenticated data to the guest
				 * localStorage.
				 *
				 * Supabase is the source of truth for authenticated users.
				 */
				dispatch(setLearningData(authenticatedData));

				hydratedUserRef.current = user.id;

				dispatch(setHydrationStatus("ready"));
			} catch (error) {
				if (cancelled) {
					return;
				}

				console.error("Failed to hydrate authenticated user:", error);

				/**
				 * Sin la nube se sigue jugando sobre `localStorage`, pero en
				 * `local`, NUNCA en `ready`: `ready` habilita el push, que haría
				 * upsert de la fila entera con esta copia — vieja si se jugó en
				 * otro dispositivo, o vacía tras un logout (que la borra) — y
				 * pisaría el progreso de la cuenta (D044). En un reintento no se
				 * reemplaza nada: ya se está jugando sobre esos datos.
				 */
				if (!failedSync) {
					dispatch(setLearningData(getLearningData()));
				}

				dispatch(setHydrationStatus("local"));

				const failures = (failedSync?.failures ?? 0) + 1;

				failedSyncRef.current = { userId: user.id, since, failures };

				retryTimeoutId = setTimeout(
					() => void hydrateAuthenticatedUser(),
					SYNC_RETRY_DELAYS_MS[
						Math.min(failures, SYNC_RETRY_DELAYS_MS.length) - 1
					],
				);
			} finally {
				isSyncing = false;
			}
		};

		/** Volver a tener red es la mejor señal para reintentar: no se espera al temporizador. */
		const retryWhenOnline = () => {
			if (!isSyncing && failedSyncRef.current?.userId === user.id) {
				void hydrateAuthenticatedUser();
			}
		};

		window.addEventListener("online", retryWhenOnline);

		void hydrateAuthenticatedUser();

		return () => {
			cancelled = true;

			controller.abort();

			clearTimeout(retryTimeoutId);

			window.removeEventListener("online", retryWhenOnline);
		};
	}, [status, user, dispatch]);

	/**
	 * Push authenticated changes to Supabase.
	 *
	 * No push is allowed until the authenticated state has
	 * finished hydrating.
	 */
	useEffect(() => {
		if (
			status !== "authenticated" ||
			!user ||
			hydrationStatus !== "ready" ||
			hydratedUserRef.current !== user.id
		) {
			return;
		}

		clearTimeout(pushTimeoutRef.current);

		pushTimeoutRef.current = setTimeout(() => {
			void pushLearningData(user.id, learningData);
		}, 800);

		return () => {
			clearTimeout(pushTimeoutRef.current);
		};
	}, [learningData, status, user, hydrationStatus]);

	/**
	 * Leaderboard: cada vez que el mejor tiempo de "Todo el mundo" mejora, se
	 * sube (mejor esfuerzo, ver upsertLeaderboardEntry) — no espera al push
	 * debounced de arriba porque esto no compite en frecuencia con el resto
	 * de `learningData` (solo cambia al batir una marca).
	 */
	useEffect(() => {
		if (
			status !== "authenticated" ||
			!user ||
			hydrationStatus !== "ready" ||
			hydratedUserRef.current !== user.id
		) {
			return;
		}

		const worldBestMs = learningData.regionBestTimes.world;

		if (
			worldBestMs === undefined ||
			pushedWorldBestRef.current === worldBestMs
		) {
			return;
		}

		pushedWorldBestRef.current = worldBestMs;

		void upsertLeaderboardEntry(
			user.id,
			"world",
			learningData.profile.name,
			worldBestMs,
		);
	}, [
		learningData.regionBestTimes.world,
		learningData.profile.name,
		status,
		user,
		hydrationStatus,
	]);

	/** Igual que el efecto de arriba, pero para el rush de Países (D033). Scope aparte ("countries:world"): la PK `(user_id, scope)` de `leaderboard_entries` ya lo soporta sin migración. */
	useEffect(() => {
		if (
			status !== "authenticated" ||
			!user ||
			hydrationStatus !== "ready" ||
			hydratedUserRef.current !== user.id
		) {
			return;
		}

		const countriesWorldBestMs =
			learningData.countriesGame.regionBestTimes.world;

		if (
			countriesWorldBestMs === undefined ||
			pushedCountriesWorldBestRef.current === countriesWorldBestMs
		) {
			return;
		}

		pushedCountriesWorldBestRef.current = countriesWorldBestMs;

		void upsertLeaderboardEntry(
			user.id,
			"countries:world",
			learningData.profile.name,
			countriesWorldBestMs,
		);
	}, [
		learningData.countriesGame.regionBestTimes.world,
		learningData.profile.name,
		status,
		user,
		hydrationStatus,
	]);

	/**
	 * Cleanup pending push.
	 */
	useEffect(() => {
		return () => {
			clearTimeout(pushTimeoutRef.current);
		};
	}, []);

	return null;
}
