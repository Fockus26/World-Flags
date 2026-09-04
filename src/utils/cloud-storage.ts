import { supabase } from "@/lib/supabase";

import type { UserLearningData } from "@/types/progress";

import { hasLearningProgress } from "./learning-storage";

export async function fetchRemoteLearningData(userId: string): Promise<UserLearningData | null> {
	const { data, error } = await supabase
		.from("user_learning_data")
		.select("profile, country_history, region_game_scores, last_configuration")
		.eq("user_id", userId)
		.maybeSingle();

	if (error) {
		console.error("Failed to fetch remote learning data:", error);

		throw error;
	}

	if (!data) {
		return null;
	}

	return {
		profile: data.profile,
		countryHistory: data.country_history,
		regionGameScores: data.region_game_scores,
		lastConfiguration: data.last_configuration,
		// No existe columna en Supabase todavía: el candado diario por región
		// solo vive en localStorage por ahora, no se sincroniza entre dispositivos.
		lastPracticeByRegion: {},
	};
}

export async function pushLearningData(userId: string, data: UserLearningData): Promise<void> {
	const { error } = await supabase.from("user_learning_data").upsert({
		user_id: userId,
		profile: data.profile,
		country_history: data.countryHistory,
		region_game_scores: data.regionGameScores,
		last_configuration: data.lastConfiguration,
		updated_at: new Date().toISOString(),
	});

	if (error) {
		console.error("Failed to push learning data:", error);

		throw error;
	}
}

/**
 * Initial synchronization when a guest becomes authenticated.
 *
 * If the user has existing cloud data:
 *
 *     local + remote -> merge
 *
 * If the user does not have cloud data:
 *
 *     local -> Supabase
 *
 * The returned value is always the data that should become
 * the authenticated user's local/Redux state.
 */
export async function syncOnLogin(
	userId: string,
	localData: UserLearningData,
): Promise<UserLearningData> {
	const remote = await fetchRemoteLearningData(userId);

	/**
	 * No existe información para este usuario.
	 *
	 * El progreso del invitado se convierte en el
	 * progreso inicial de la cuenta.
	 */
	if (!remote || !hasLearningProgress(remote)) {
		await pushLearningData(userId, localData);

		return localData;
	}

	/**
	 * La cuenta ya tiene progreso.
	 *
	 * El progreso del invitado NO modifica la cuenta.
	 */
	return remote;
}
