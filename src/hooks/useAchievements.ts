import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLearningData } from "@/store/slices/gameSlice";
import type { AchievementUnlock } from "@/types/progress";
import {
	ACHIEVEMENTS,
	type AchievementCategory,
	type AchievementProgress,
	isUnlocked,
} from "@/utils/achievements";
import { markAchievementsSeen } from "@/utils/learning-storage";

export interface AchievementView {
	id: string;
	name: string;
	description: string;
	emoji: string;
	category: AchievementCategory;
	progress: AchievementProgress;
	unlocked: boolean;
	unlockedAt: string | null;
	seenAt: string | null;
}

/**
 * Lectura del catálogo ya cruzado con el progreso del usuario.
 *
 * NO contiene el efecto que desbloquea: eso vive en `AchievementsEffects` y
 * corre una sola vez, porque este hook lo consumen varios componentes a la vez.
 */
export function useAchievements() {
	const dispatch = useAppDispatch();

	const learningData = useAppSelector((state) => state.game.learningData);

	const unlockedIds = new Set(Object.keys(learningData.achievements));

	const catalog: AchievementView[] = ACHIEVEMENTS.map((achievement) => {
		const progress = achievement.evaluate(learningData, unlockedIds);

		// Manda el sello, no la condición: un logro desbloqueado sigue
		// desbloqueado aunque su evidencia haya caducado (ver la invariante de
		// monotonía en `utils/achievements.ts`).
		const unlock: AchievementUnlock | undefined =
			learningData.achievements[achievement.id];

		return {
			id: achievement.id,
			name: achievement.name,
			description: achievement.description,
			emoji: achievement.emoji,
			category: achievement.category,
			progress,
			unlocked: unlock !== undefined || isUnlocked(progress),
			unlockedAt: unlock?.unlockedAt ?? null,
			seenAt: unlock?.seenAt ?? null,
		};
	});

	const unlockedCount = catalog.filter((item) => item.unlocked).length;

	const unseenCount = catalog.filter(
		(item) => item.unlockedAt !== null && item.seenAt === null,
	).length;

	const markAllSeen = () => {
		const updatedData = markAchievementsSeen(learningData);

		// Mismo "sin delta, no se despacha" que en AchievementsEffects: si ya
		// estaban todos vistos, `markAchievementsSeen` devuelve el mismo objeto.
		if (updatedData === learningData) {
			return;
		}

		dispatch(setLearningData(updatedData));
	};

	return {
		catalog,
		unlockedCount,
		totalCount: ACHIEVEMENTS.length,
		unseenCount,
		markAllSeen,
	};
}
