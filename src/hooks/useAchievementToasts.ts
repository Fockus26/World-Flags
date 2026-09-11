import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { dismissAchievementToast } from "@/store/slices/achievementToastSlice";
import { ACHIEVEMENTS } from "@/utils/achievements";

const ACHIEVEMENTS_BY_ID = new Map(
	ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]),
);

export interface AchievementToastView {
	instanceId: string;
	name: string;
	description: string;
	emoji: string;
}

/**
 * Lee la cola de avisos pendientes (`AchievementsEffects` la llena) y la
 * resuelve contra el catálogo. Un id que no exista en el catálogo actual se
 * descarta en silencio en vez de romper el render — mismo espíritu que
 * `UnlockedAchievements` tipando lo persistido como `string`, no
 * `AchievementId`: no hay garantía de que la cola y el catálogo de esta
 * versión concreta del código coincidan siempre.
 */
export function useAchievementToasts() {
	const dispatch = useAppDispatch();

	const queue = useAppSelector((state) => state.achievementToasts.queue);

	const toasts: AchievementToastView[] = queue.flatMap((item) => {
		const achievement = ACHIEVEMENTS_BY_ID.get(item.achievementId);

		if (!achievement) return [];

		return [
			{
				instanceId: item.instanceId,
				name: achievement.name,
				description: achievement.description,
				emoji: achievement.emoji,
			},
		];
	});

	const dismiss = (instanceId: string) => {
		dispatch(dismissAchievementToast(instanceId));
	};

	return { toasts, dismiss };
}
