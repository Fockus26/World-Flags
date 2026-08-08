import { supabase } from "@/lib/supabase";
import type { Region } from "@/types/country";
import type {
	CountriesLearningHistory,
	RegionGameScores,
	UserLearningData,
} from "@/types/progress";
import { MAX_COUNTRY_ATTEMPTS, MAX_REGION_GAMES } from "./learning-storage";

export async function fetchRemoteLearningData(
	userId: string,
): Promise<UserLearningData | null> {
	const { data, error } = await supabase
		.from("user_learning_data")
		.select("profile, country_history, region_game_scores, last_configuration")
		.eq("user_id", userId)
		.maybeSingle();

	if (error || !data) return null;

	return {
		profile: data.profile,
		countryHistory: data.country_history,
		regionGameScores: data.region_game_scores,
		lastConfiguration: data.last_configuration,
	};
}

export async function pushLearningData(
	userId: string,
	data: UserLearningData,
): Promise<void> {
	await supabase.from("user_learning_data").upsert({
		user_id: userId,
		profile: data.profile,
		country_history: data.countryHistory,
		region_game_scores: data.regionGameScores,
		last_configuration: data.lastConfiguration,
		updated_at: new Date().toISOString(),
	});
}

export function mergeLearningData(
	local: UserLearningData,
	remote: UserLearningData,
): UserLearningData {
	const countryHistory: CountriesLearningHistory = { ...remote.countryHistory };

	for (const [code, entry] of Object.entries(local.countryHistory)) {
		const remoteAttempts = remote.countryHistory[code]?.attempts ?? [];
		countryHistory[code] = {
			attempts: [...remoteAttempts, ...entry.attempts].slice(
				-MAX_COUNTRY_ATTEMPTS,
			),
		};
	}

	const regionGameScores: RegionGameScores = { ...remote.regionGameScores };

	for (const [region, scores] of Object.entries(local.regionGameScores) as [
		Region,
		number[],
	][]) {
		const remoteScores = remote.regionGameScores[region] ?? [];
		regionGameScores[region] = [...remoteScores, ...scores].slice(
			-MAX_REGION_GAMES,
		);
	}

	return {
		profile: remote.profile,
		countryHistory,
		regionGameScores,
		lastConfiguration: remote.lastConfiguration ?? local.lastConfiguration,
	};
}

export async function syncOnLogin(
	userId: string,
	localData: UserLearningData,
): Promise<UserLearningData> {
	const remote = await fetchRemoteLearningData(userId);
	const merged = remote ? mergeLearningData(localData, remote) : localData;

	await pushLearningData(userId, merged);

	return merged;
}
