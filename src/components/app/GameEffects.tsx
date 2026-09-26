import { useEffect, useRef } from "react";

import { useAuth } from "@/hooks/useAuth";

import { store } from "@/store";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { setHydrationStatus, setLearningData } from "@/store/slices/gameSlice";

import {
	resetSync,
	setHasPendingChanges,
	syncFailed,
	syncSucceeded,
} from "@/store/slices/syncSlice";

import type { UserLearningData } from "@/types/progress";

import {
	isNetworkFailure,
	syncLeaderboardProfile,
	syncLearningData,
	upsertLeaderboardEntry,
} from "@/utils/cloud-storage";

import {
	collectLeaderboardMarks,
	createLeaderboardUploadQueue,
	type LeaderboardUploadQueue,
} from "@/utils/leaderboard-upload";

import {
	clearLearningData,
	createDefaultLearningData,
	getLearningData,
	getSyncBase,
	hasPendingChanges,
	mergeLearningData,
	saveLearningData,
	saveSyncBase,
} from "@/utils/learning-storage";

/**
 * Espera antes de cada reintento de una sincronización fallida (el último
 * valor se repite mientras siga fallando). Además se reintenta en cuanto
 * vuelve la red (`online`) y con cada evento de Supabase Auth (D044).
 */
const SYNC_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000];

/**
 * Subidas agrupadas (D051): tras un cambio se espera a que el usuario pare
 * `SYNC_IDLE_MS`, pero nunca más de `SYNC_MAX_WAIT_MS` desde el primer cambio
 * sin subir. Una práctica de Europa (~60 calificaciones cada 2–4 s) pasa de
 * ~60 subidas de la fila entera a una cada minuto más la del final. Esperar
 * no arriesga nada: lo pendiente ya está en `localStorage` y se sube al
 * volver, aunque se cierre la app antes.
 */
const SYNC_IDLE_MS = 5_000;
const SYNC_MAX_WAIT_MS = 60_000;

/** Espera tras un cambio de nombre o avatar antes de ponerlo al día en el ranking (D079). */
const LEADERBOARD_PROFILE_IDLE_MS = 3_000;

/** Una sincronización de la cuenta falló y se juega en modo `local`. */
interface FailedSync {
	userId: string;
	/** Fallos seguidos: elige la espera en `SYNC_RETRY_DELAYS_MS`. */
	failures: number;
}

/**
 * Base de sincronización en memoria (D049), con su JSON ya calculado: se
 * compara contra `learningData` en cada cambio para saber si hay algo
 * pendiente de subir.
 */
interface SyncBaseRef {
	userId: string;
	data: UserLearningData;
	json: string;
}

function toSyncBaseRef(userId: string, data: UserLearningData): SyncBaseRef {
	return { userId, data, json: JSON.stringify(data) };
}

/** Lo que el efecto de subidas expone a los demás efectos. */
interface SyncScheduler {
	/** Hubo un cambio: subir cuando el usuario pare (o al llegar al tope). */
	schedule: () => void;
	/** Subir ya. */
	flush: () => void;
}

export function GameEffects() {
	const dispatch = useAppDispatch();

	const learningData = useAppSelector((state) => state.game.learningData);

	const hydrationStatus = useAppSelector((state) => state.game.hydrationStatus);

	const connectivity = useAppSelector((state) => state.sync.connectivity);

	const lastSyncedAt = useAppSelector((state) => state.sync.lastSyncedAt);

	const syncRequestId = useAppSelector((state) => state.sync.syncRequestId);

	const { user, status } = useAuth();

	const userId = user?.id ?? null;

	const hydratedUserRef = useRef<string | null>(null);

	/**
	 * Sobrevive a las re-ejecuciones del efecto de hidratación (`user` cambia
	 * de identidad con cada evento de Supabase Auth): distingue un reintento,
	 * que no vuelve a `loading` ni reemplaza los datos con los que ya se está
	 * jugando, de un primer intento.
	 */
	const failedSyncRef = useRef<FailedSync | null>(null);

	/** Base de sincronización de la cuenta actual (D049). */
	const syncBaseRef = useRef<SyncBaseRef | null>(null);

	const schedulerRef = useRef<SyncScheduler | null>(null);

	/** `status` del render anterior: distingue un logout real de un invitado normal. */
	const previousStatusRef = useRef<typeof status | null>(null);

	/** Cola de subidas al ranking de la cuenta actual (D140). */
	const leaderboardQueueRef = useRef<LeaderboardUploadQueue | null>(null);

	/** Lo que la cola del ranking lee entre subida y subida: si puede subir y con qué datos. */
	const canUploadLeaderboardRef = useRef(false);
	const leaderboardDataRef = useRef<UserLearningData>(learningData);

	/** Último perfil (usuario, nombre, avatar) que quedó al día en el ranking. */
	const syncedLeaderboardProfileRef = useRef<string | null>(null);

	/**
	 * Red de seguridad: si Supabase Auth no resuelve (red caída, mal
	 * configurado), `status` se queda en "loading" para siempre y el invitado
	 * ve su progreso vacío. Tras 2.5 s sin resolver, se hidrata desde
	 * localStorage igualmente (si luego llega la sesión, el efecto de abajo
	 * re-hidrata). Se marca `local`, no `ready`: `ready` habilitaría el push a
	 * Supabase antes de tiempo, pero sin ninguna marca la pantalla de inicio
	 * se quedaría en skeleton para siempre (D042).
	 */
	useEffect(() => {
		if (status !== "loading") {
			return;
		}

		const timeoutId = setTimeout(() => {
			dispatch(setLearningData(getLearningData()));
			dispatch(setHydrationStatus("local"));
		}, 2500);

		return () => clearTimeout(timeoutId);
	}, [status, dispatch]);

	/**
	 * Hidratación.
	 *
	 * Invitado: localStorage -> Redux.
	 *
	 * Cuenta: localStorage + base de sincronización + Supabase -> Redux.
	 */
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
			hydratedUserRef.current = null;

			failedSyncRef.current = null;

			syncBaseRef.current = null;

			dispatch(resetSync());

			/**
			 * Logout real (authenticated -> guest): mientras se estuvo
			 * autenticado las acciones del juego persistieron los datos del
			 * usuario en localStorage, así que hay que limpiarlos (con su base
			 * de sincronización) para que no queden disponibles para la sesión
			 * de invitado. Lo que no se hubiera subido se pierde aquí: por eso
			 * `AuthSection` avisa antes de cerrar sesión con cambios pendientes.
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
			clearTimeout(retryTimeoutId);

			const failedSync =
				failedSyncRef.current?.userId === user.id
					? failedSyncRef.current
					: null;

			// En un reintento ya se está jugando sobre los datos locales
			// (`local`): volver a `loading` no aportaría nada.
			if (!failedSync) {
				dispatch(setHydrationStatus("loading"));
			}

			isSyncing = true;

			/**
			 * Datos de este dispositivo: los de la cuenta (con lo jugado sin
			 * conexión, si lo hubo) o los del invitado que acaba de entrar.
			 */
			const localData = getLearningData();

			/**
			 * Base de sincronización de la cuenta en este dispositivo (D049):
			 * contra ella se sabe qué cambió aquí y no está en la nube. `null`
			 * en el primer login en este dispositivo (y tras un logout): lo
			 * local es del invitado, que solo pasa a la cuenta si la cuenta no
			 * tiene progreso; si lo tiene, se descarta (D056).
			 */
			const base = getSyncBase(user.id);

			try {
				const { data: syncedData, discardedLocal } = await syncLearningData(
					user.id,
					localData,
					base,
					controller.signal,
				);

				if (cancelled) {
					return;
				}

				/**
				 * Lo jugado mientras la sincronización estaba en vuelo ya está
				 * en `localStorage` pero no en `syncedData`: reemplazar sin más
				 * lo borraría. Se fusiona con lo que se mandó como base: gana
				 * lo que cambió durante el vuelo. Salvo si lo local se descartó
				 * (era del invitado): lo jugado en vuelo también lo es.
				 */
				const latestLocalData = getLearningData();

				const authenticatedData =
					discardedLocal ||
					JSON.stringify(latestLocalData) === JSON.stringify(localData)
						? syncedData
						: mergeLearningData(syncedData, latestLocalData, localData);

				failedSyncRef.current = null;

				/**
				 * Datos y base se guardan juntos, en la misma tarea: tienen
				 * que ser una pareja coherente para que la próxima carga sepa
				 * qué quedó sin subir (D049). La base es lo que quedó en la
				 * nube; la diferencia con `authenticatedData`, si la hay, es lo
				 * jugado durante el vuelo, que el efecto de subidas manda.
				 */
				saveLearningData(authenticatedData);
				saveSyncBase(user.id, syncedData);
				syncBaseRef.current = toSyncBaseRef(user.id, syncedData);

				dispatch(setLearningData(authenticatedData));

				hydratedUserRef.current = user.id;

				dispatch(syncSucceeded(new Date().toISOString()));

				dispatch(setHydrationStatus("ready"));
			} catch (error) {
				if (cancelled) {
					return;
				}

				const kind = isNetworkFailure(error) ? "network" : "server";

				// Sin red es un estado esperado que la UI ya comunica (D050).
				if (kind === "server") {
					console.error("Failed to hydrate authenticated user:", error);
				}

				/**
				 * Sin la nube se sigue jugando sobre `localStorage`, pero en
				 * `local`, NUNCA en `ready`: `ready` habilita las subidas, y
				 * esta copia sin contrastar pisaría el progreso de la cuenta
				 * (D044). En un reintento no se reemplaza nada: ya se está
				 * jugando sobre esos datos.
				 */
				if (!failedSync) {
					dispatch(setLearningData(localData));

					/**
					 * Sin base (la cuenta nunca sincronizó en este dispositivo)
					 * lo local es del invitado: al recuperarse, pasa a la cuenta
					 * solo si ésta no tiene progreso (D056). Con base, lo que se
					 * juegue ahora es de la cuenta y quedará pendiente de subir.
					 */
					syncBaseRef.current = base ? toSyncBaseRef(user.id, base) : null;
				}

				dispatch(syncFailed(kind));

				dispatch(setHydrationStatus("local"));

				const failures = (failedSync?.failures ?? 0) + 1;

				failedSyncRef.current = { userId: user.id, failures };

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
	 * Subidas de la cuenta ya hidratada (D051).
	 *
	 * Cada subida es una sincronización completa (leer → fusionar con la base
	 * → subir si aporta algo), no un upsert a ciegas: otro dispositivo pudo
	 * subir entre medias. Se agrupan (ver `SYNC_IDLE_MS`), se adelantan al
	 * ocultar la app o al volver la red, y si fallan se reintentan con la
	 * misma espera creciente que la hidratación. Nada se sube antes de
	 * hidratar.
	 */
	useEffect(() => {
		if (
			status !== "authenticated" ||
			!userId ||
			hydrationStatus !== "ready" ||
			hydratedUserRef.current !== userId
		) {
			return;
		}

		const controller = new AbortController();

		let inFlight = false;

		let rerunAfterFlight = false;

		let failures = 0;

		let idleTimeoutId: ReturnType<typeof setTimeout> | undefined;

		let maxWaitTimeoutId: ReturnType<typeof setTimeout> | undefined;

		let retryTimeoutId: ReturnType<typeof setTimeout> | undefined;

		const clearTimers = () => {
			clearTimeout(idleTimeoutId);
			clearTimeout(maxWaitTimeoutId);
			clearTimeout(retryTimeoutId);
			idleTimeoutId = undefined;
			maxWaitTimeoutId = undefined;
			retryTimeoutId = undefined;
		};

		const runSync = async () => {
			clearTimers();

			if (inFlight) {
				rerunAfterFlight = true;
				return;
			}

			const syncBase = syncBaseRef.current;
			const base = syncBase?.userId === userId ? syncBase.data : null;
			const localAtStart = store.getState().game.learningData;

			inFlight = true;

			try {
				const { data: syncedData } = await syncLearningData(
					userId,
					localAtStart,
					base,
					controller.signal,
				);

				if (controller.signal.aborted) return;

				// Lo cambiado durante el vuelo gana (base = lo que se mandó).
				const latestData = store.getState().game.learningData;

				const adoptedData =
					latestData === localAtStart
						? syncedData
						: mergeLearningData(syncedData, latestData, localAtStart);

				saveSyncBase(userId, syncedData);
				syncBaseRef.current = toSyncBaseRef(userId, syncedData);

				// Sin delta, no se despacha: cada despacho re-dispara los
				// efectos que miran `learningData` (logros, esta misma cola).
				if (JSON.stringify(adoptedData) !== JSON.stringify(latestData)) {
					saveLearningData(adoptedData);
					dispatch(setLearningData(adoptedData));
				}

				failures = 0;

				dispatch(syncSucceeded(new Date().toISOString()));

				const pending = hasPendingChanges(adoptedData, syncedData);

				dispatch(setHasPendingChanges(pending));

				if (pending) schedule();
			} catch (error) {
				if (controller.signal.aborted) return;

				const kind = isNetworkFailure(error) ? "network" : "server";

				if (kind === "server") {
					console.error("Failed to sync learning data:", error);
				}

				dispatch(syncFailed(kind));

				failures += 1;

				retryTimeoutId = setTimeout(
					() => void runSync(),
					SYNC_RETRY_DELAYS_MS[
						Math.min(failures, SYNC_RETRY_DELAYS_MS.length) - 1
					],
				);
			} finally {
				inFlight = false;

				if (rerunAfterFlight && !controller.signal.aborted) {
					rerunAfterFlight = false;
					void runSync();
				}
			}
		};

		function schedule() {
			// Tras un fallo manda el reintento (y el evento `online`): no se
			// martillea a la nube con cada calificación.
			if (retryTimeoutId !== undefined) return;

			clearTimeout(idleTimeoutId);
			idleTimeoutId = setTimeout(() => void runSync(), SYNC_IDLE_MS);

			if (maxWaitTimeoutId === undefined) {
				maxWaitTimeoutId = setTimeout(() => void runSync(), SYNC_MAX_WAIT_MS);
			}
		}

		/** La app pasa a segundo plano (o se cierra): se sube lo pendiente ya. */
		const flushWhenHidden = () => {
			if (
				document.visibilityState === "hidden" &&
				store.getState().sync.hasPendingChanges
			) {
				void runSync();
			}
		};

		schedulerRef.current = { schedule, flush: () => void runSync() };

		document.addEventListener("visibilitychange", flushWhenHidden);
		window.addEventListener("pagehide", flushWhenHidden);

		// Lo que quedara pendiente de antes (p. ej. lo jugado durante la
		// hidratación) entra en la cola.
		if (store.getState().sync.hasPendingChanges) schedule();

		return () => {
			controller.abort();

			clearTimers();

			schedulerRef.current = null;

			document.removeEventListener("visibilitychange", flushWhenHidden);
			window.removeEventListener("pagehide", flushWhenHidden);
		};
	}, [status, userId, hydrationStatus, dispatch]);

	/**
	 * ¿Hay algo de la cuenta que la nube no tiene? Se recalcula con cada
	 * cambio, también en `local` (sin subidas): es lo que dice a la UI que el
	 * progreso está solo en este dispositivo y lo que protege el logout.
	 */
	useEffect(() => {
		if (
			status !== "authenticated" ||
			!userId ||
			(hydrationStatus !== "ready" && hydrationStatus !== "local")
		) {
			return;
		}

		const syncBase = syncBaseRef.current;

		const pending =
			syncBase?.userId === userId &&
			JSON.stringify(learningData) !== syncBase.json;

		if (pending !== store.getState().sync.hasPendingChanges) {
			dispatch(setHasPendingChanges(pending));
		}

		if (pending) schedulerRef.current?.schedule();
	}, [learningData, status, userId, hydrationStatus, dispatch]);

	/** Alguien pidió sincronizar ya (volvió la red, o se va a cerrar sesión). */
	useEffect(() => {
		if (syncRequestId > 0) schedulerRef.current?.flush();
	}, [syncRequestId]);

	/**
	 * Ranking público (D033, D137): las mejores marcas de la regla vigente de
	 * cada juego, de "Todo el mundo" y de cada continente completo, se suben a
	 * su scope — mejor esfuerzo, ver `upsertLeaderboardEntry`. No espera a las
	 * subidas agrupadas porque esto no compite en frecuencia con el resto de
	 * `learningData` (solo cambia al batir una marca).
	 *
	 * Lo hace una cola por cuenta (D140, `leaderboard-upload.ts`): en serie,
	 * con la última marca subida de cada scope, y si una subida falla (red o
	 * servidor) reintenta con espera creciente, no con cada respuesta de la
	 * partida (P14). Si el servidor la rechaza por imposible, no la reintenta
	 * (D113); vuelve a probarse en la próxima carga.
	 */
	useEffect(() => {
		if (!userId) return;

		const queue = createLeaderboardUploadQueue({
			getMarks: () => collectLeaderboardMarks(leaderboardDataRef.current),
			canUpload: () => canUploadLeaderboardRef.current,
			upload: (mark) =>
				upsertLeaderboardEntry(
					userId,
					mark.scope,
					leaderboardDataRef.current.profile,
					mark.bestTimeMs,
				),
		});

		leaderboardQueueRef.current = queue;

		return () => {
			queue.dispose();
			if (leaderboardQueueRef.current === queue) {
				leaderboardQueueRef.current = null;
			}
		};
	}, [userId]);

	useEffect(() => {
		leaderboardDataRef.current = learningData;
		canUploadLeaderboardRef.current =
			status === "authenticated" &&
			userId !== null &&
			hydrationStatus === "ready" &&
			hydratedUserRef.current === userId &&
			connectivity !== "offline";

		if (canUploadLeaderboardRef.current) {
			void leaderboardQueueRef.current?.run();
		}
	}, [learningData, status, userId, hydrationStatus, connectivity]);

	const { name, avatarStyle, avatarSeed } = learningData.profile;

	/**
	 * Nombre y avatar en el ranking (D079): una vez por carga y con cada
	 * cambio de perfil, las filas del usuario se ponen al día sin tocar sus
	 * tiempos (ver `syncLeaderboardProfile`). Mejor esfuerzo: si falla, se
	 * reintenta tras la siguiente sincronización buena (`lastSyncedAt`).
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: lastSyncedAt re-dispara el reintento de un perfil que no se pudo subir
	useEffect(() => {
		if (
			status !== "authenticated" ||
			!userId ||
			hydrationStatus !== "ready" ||
			hydratedUserRef.current !== userId ||
			connectivity === "offline"
		) {
			return;
		}

		const profileKey = JSON.stringify([userId, name, avatarStyle, avatarSeed]);

		if (syncedLeaderboardProfileRef.current === profileKey) return;

		// Se espera a que el usuario pare: probar avatares uno tras otro no
		// lanza una escritura por clic, y dos escrituras en vuelo no pueden
		// llegar desordenadas y dejar el avatar anterior.
		const timeoutId = setTimeout(() => {
			syncedLeaderboardProfileRef.current = profileKey;

			void syncLeaderboardProfile(userId, {
				name,
				avatarStyle,
				avatarSeed,
			}).then((synced) => {
				if (!synced && syncedLeaderboardProfileRef.current === profileKey) {
					syncedLeaderboardProfileRef.current = null;
				}
			});
		}, LEADERBOARD_PROFILE_IDLE_MS);

		return () => clearTimeout(timeoutId);
	}, [
		name,
		avatarStyle,
		avatarSeed,
		status,
		userId,
		hydrationStatus,
		connectivity,
		lastSyncedAt,
	]);

	return null;
}
