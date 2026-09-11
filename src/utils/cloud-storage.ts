import { supabase } from "@/lib/supabase";

import type { UserLearningData } from "@/types/progress";

import {
	hasLearningProgress,
	mergeLearningData,
	normalizeLearningData,
} from "./learning-storage";

export async function fetchRemoteLearningData(
	userId: string,
): Promise<UserLearningData | null> {
	const { data, error } = await supabase
		.from("user_learning_data")
		.select(
			"profile, country_history, region_game_scores, region_best_times, last_configuration, last_practice_by_country, achievements, stats, session_history",
		)
		.eq("user_id", userId)
		.maybeSingle();

	if (error) {
		console.error("Failed to fetch remote learning data:", error);

		throw error;
	}

	if (!data) {
		return null;
	}

	/**
	 * Pasa por `normalizeLearningData` (el mismo normalizador que usa
	 * localStorage) en vez de mapear a pelo: una fila creada antes de que
	 * existieran estas columnas llega con campos sin definir, y cualquier
	 * lectura posterior de `stats` reventaría. Además así la siembra
	 * retroactiva de días activos también aplica a los datos de la nube.
	 */
	return normalizeLearningData({
		profile: data.profile,
		countryHistory: data.country_history,
		regionGameScores: data.region_game_scores,
		lastConfiguration: data.last_configuration,
		regionBestTimes: data.region_best_times ?? {},
		lastPracticeByCountry: data.last_practice_by_country ?? {},
		achievements: data.achievements ?? {},
		stats: data.stats ?? undefined,
		sessionHistory: data.session_history ?? [],
	});
}

export async function pushLearningData(
	userId: string,
	data: UserLearningData,
): Promise<void> {
	const { error } = await supabase.from("user_learning_data").upsert({
		user_id: userId,
		profile: data.profile,
		country_history: data.countryHistory,
		region_game_scores: data.regionGameScores,
		region_best_times: data.regionBestTimes,
		last_configuration: data.lastConfiguration,
		last_practice_by_country: data.lastPracticeByCountry,
		achievements: data.achievements,
		stats: data.stats,
		session_history: data.sessionHistory,
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
	 * La cuenta ya tiene progreso: gana lo remoto campo a campo, salvo lo que
	 * `mergeLearningData` sabe unir sin perder nada (candado diario, mejores
	 * marcas, logros, estadísticas e historial).
	 */
	const merged = mergeLearningData(remote, localData);

	/**
	 * Si el merge aportó algo que no estaba en remoto, se sube de vuelta.
	 *
	 * Se compara el objeto ENTERO, no campo por campo: antes había que
	 * acordarse de añadir cada campo nuevo también a esta condición, y
	 * olvidarlo fallaba en silencio — el merge se quedaba en este dispositivo
	 * y se perdía en el siguiente.
	 */
	if (JSON.stringify(merged) !== JSON.stringify(remote)) {
		await pushLearningData(userId, merged);
	}

	return merged;
}

export interface LeaderboardEntry {
	userId: string;
	displayName: string;
	bestTimeMs: number;
}

/**
 * Ranking completo de un scope ("world" por ahora), del más rápido al más
 * lento. Se trae completo (no solo el top N) para poder calcular en qué
 * puesto queda el usuario actual aunque no esté en el top 5 — la tabla
 * `leaderboard_entries` es pública y liviana (nombre + tiempo), así que esto
 * no debería ser un problema salvo con muchísimos usuarios.
 */
export async function fetchLeaderboard(
	scope: string,
): Promise<LeaderboardEntry[]> {
	const { data, error } = await supabase
		.from("leaderboard_entries")
		.select("user_id, display_name, best_time_ms")
		.eq("scope", scope)
		.order("best_time_ms", { ascending: true });

	if (error) {
		console.error("Failed to fetch leaderboard:", error);

		throw error;
	}

	return (data ?? []).map((row) => ({
		userId: row.user_id,
		displayName: row.display_name,
		bestTimeMs: row.best_time_ms,
	}));
}

/**
 * Se llama solo cuando el usuario mejora su marca (ver GameEffects.tsx) — no
 * hace falta un merge, cada mejora reemplaza la fila entera del usuario.
 * Es un "mejor esfuerzo": si falla (p. ej. la tabla todavía no existe en
 * Supabase, ver supabase/leaderboard.sql) no debe romper el juego, solo se
 * registra el error.
 */
export async function upsertLeaderboardEntry(
	userId: string,
	scope: string,
	displayName: string,
	bestTimeMs: number,
): Promise<void> {
	const { error } = await supabase.from("leaderboard_entries").upsert({
		user_id: userId,
		scope,
		display_name: displayName,
		best_time_ms: bestTimeMs,
		updated_at: new Date().toISOString(),
	});

	if (error) {
		console.error("Failed to update leaderboard entry:", error);
	}
}
