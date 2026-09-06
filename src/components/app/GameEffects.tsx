import { useEffect, useRef } from "react";

import { useAuth } from "@/hooks/useAuth";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { setHydrationStatus, setLearningData } from "@/store/slices/gameSlice";

import { pushLearningData, syncOnLogin, upsertLeaderboardEntry } from "@/utils/cloud-storage";

import {
	clearLearningData,
	createDefaultLearningData,
	getLearningData,
} from "@/utils/learning-storage";

export function GameEffects() {
	const dispatch = useAppDispatch();

	const learningData = useAppSelector((state) => state.game.learningData);

	const hydrationStatus = useAppSelector((state) => state.game.hydrationStatus);

	const { user, status } = useAuth();

	const hydratedUserRef = useRef<string | null>(null);

	const pushTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const pushedWorldBestRef = useRef<number | undefined>(undefined);

	/**
	 * Hydrate guest/authenticated state.
	 *
	 * Guest:
	 *     localStorage -> Redux
	 *
	 * Authenticated:
	 *     localStorage + Supabase -> Redux
	 */
	useEffect(() => {
		if (status === "loading") {
			return;
		}

		/**
		 * USER IS GUEST
		 *
		 * Any data that belonged to the authenticated session
		 * must not remain available to the guest session.
		 */
		if (status === "guest") {
			clearTimeout(pushTimeoutRef.current);

			hydratedUserRef.current = null;

			/**
			 * Clear the local authenticated cache.
			 *
			 * This is important because while authenticated,
			 * game actions may have persisted the user's data
			 * locally.
			 */
			clearLearningData();
			const guestData = createDefaultLearningData();

			dispatch(setLearningData(guestData));
			dispatch(setHydrationStatus("ready"));

			return;
		}

		/**
		 * USER IS AUTHENTICATED
		 */
		if (status !== "authenticated" || !user || hydratedUserRef.current === user.id) {
			return;
		}

		let cancelled = false;

		const hydrateAuthenticatedUser = async () => {
			clearTimeout(pushTimeoutRef.current);

			dispatch(setHydrationStatus("loading"));

			try {
				/**
				 * Data stored locally before login.
				 *
				 * This is the guest data that may be transferred
				 * if the account has no existing progress.
				 */
				const localData = getLearningData();

				/**
				 * syncOnLogin:
				 *
				 * - account with progress -> remote wins
				 * - account without progress -> guest data transfers
				 */
				const authenticatedData = await syncOnLogin(user.id, localData);

				if (cancelled) {
					return;
				}

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
				 * Fallback to local data if Supabase fails.
				 */
				const localData = getLearningData();

				dispatch(setLearningData(localData));

				hydratedUserRef.current = user.id;

				dispatch(setHydrationStatus("ready"));
			}
		};

		void hydrateAuthenticatedUser();

		return () => {
			cancelled = true;
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

		if (worldBestMs === undefined || pushedWorldBestRef.current === worldBestMs) {
			return;
		}

		pushedWorldBestRef.current = worldBestMs;

		void upsertLeaderboardEntry(user.id, "world", learningData.profile.name, worldBestMs);
	}, [learningData.regionBestTimes.world, learningData.profile.name, status, user, hydrationStatus]);

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
