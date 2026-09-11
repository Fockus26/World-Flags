import { countries } from "@/data/countries";
import type { Region } from "@/types/country";
import type { UserLearningData } from "@/types/progress";
import { getCurrentStreak, isCountryLearned } from "@/utils/learning-storage";
import { REGION_COUNTRY_COUNTS } from "@/utils/region-stats";

/**
 * ⚠️ COPY PROVISIONAL — pendiente de aprobación del dueño.
 *
 * Los nombres, las descripciones y los umbrales marcados con 🔸 son una
 * propuesta, no contenido final: `context/DESIGN_RULES.md` › Contenido prohíbe
 * que un agente invente copy definitivo. Hay fila abierta en
 * `context/CONTENT_CHECKLIST.md`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * INVARIANTE: UN LOGRO NUNCA SE DES-DESBLOQUEA.
 *
 * `evaluate` tiene que ser monótono: una vez que una condición se cumple, no
 * puede dejar de cumplirse por seguir jugando. Y un logro sellado no se vuelve
 * a tocar (`sealAchievements` no reescribe entradas existentes).
 *
 * No es un detalle de diseño, sostiene dos cosas:
 *
 * 1. Corrección. `MAX_REGION_GAMES = 3` hace que `regionGameScores` solo
 *    guarde los tres últimos puntajes por continente: "sacaste un 10" es
 *    evidencia que caduca a las tres partidas. Sin el sellado, el usuario
 *    perdería el logro justamente por seguir practicando.
 * 2. Terminación. El efecto que desbloquea escribe en `learningData`, lo que
 *    lo vuelve a disparar. Como el conjunto de desbloqueados solo crece y está
 *    acotado por el catálogo, el punto fijo de abajo siempre termina.
 *
 * Si algún día se añade un logro que se pueda perder, este bucle no termina.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const ACHIEVEMENT_CATEGORIES = [
	"descubrimiento",
	"continentes",
	"velocidad",
	"precision",
	"constancia",
	"meta",
] as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> =
	{
		descubrimiento: "Descubrimiento",
		continentes: "Continentes",
		velocidad: "Velocidad",
		precision: "Precisión",
		constancia: "Constancia",
		meta: "Meta",
	};

/** `current >= target` es la condición de desbloqueo. Los logros de sí/no usan target 1. */
export interface AchievementProgress {
	current: number;
	target: number;
}

export interface AchievementDefinition {
	id: string;
	name: string;
	description: string;
	emoji: string;
	category: AchievementCategory;
	evaluate: (
		data: UserLearningData,
		unlockedIds: ReadonlySet<string>,
	) => AchievementProgress;
}

const AMERICAS_REGIONS: Region[] = [
	"north-america",
	"central-america",
	"caribbean",
	"south-america",
];

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

function countLearned(data: UserLearningData): number {
	return Object.values(data.countryHistory).filter(({ review }) =>
		isCountryLearned(review),
	).length;
}

function countLearnedInRegions(
	data: UserLearningData,
	regions: readonly Region[],
): number {
	const regionSet = new Set(regions);

	return countries.filter(
		(country) =>
			regionSet.has(country.region) &&
			isCountryLearned(data.countryHistory[country.code]?.review ?? null),
	).length;
}

function regionsTotal(regions: readonly Region[]): number {
	return regions.reduce(
		(total, region) => total + REGION_COUNTRY_COUNTS[region],
		0,
	);
}

/** Logro de sí/no: 1 cuando se cumple, 0 mientras no. */
function flag(condition: boolean): AchievementProgress {
	return { current: condition ? 1 : 0, target: 1 };
}

function learnedCountAchievement(
	id: string,
	name: string,
	description: string,
	emoji: string,
	target: number,
): AchievementDefinition {
	return {
		id,
		name,
		description,
		emoji,
		category: "descubrimiento",
		evaluate: (data) => ({ current: countLearned(data), target }),
	};
}

function regionAchievement(
	id: string,
	name: string,
	emoji: string,
	regions: readonly Region[],
	regionLabel: string,
): AchievementDefinition {
	const target = regionsTotal(regions);

	return {
		id,
		name,
		description: `Aprende los ${target} países de ${regionLabel}`,
		emoji,
		category: "continentes",
		evaluate: (data) => ({
			current: countLearnedInRegions(data, regions),
			target,
		}),
	};
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
	// ── Descubrimiento — todos retroactivos (salen de `countryHistory`) ──
	learnedCountAchievement(
		"primeros_pasos",
		"Primeros pasos",
		"Aprende tu primera bandera",
		"🌱",
		1,
	),
	learnedCountAchievement(
		"veinte_banderas",
		"Veinte banderas",
		"Aprende 20 banderas",
		"🚩",
		20,
	),
	learnedCountAchievement(
		"medio_centenar",
		"Medio centenar",
		"Aprende 50 banderas",
		"🎒",
		50,
	),
	learnedCountAchievement(
		"primeras_cien",
		"Las primeras cien",
		"Aprende 100 banderas",
		"💯",
		100,
	),
	learnedCountAchievement(
		"ciento_cincuenta",
		"Ciento cincuenta",
		"Aprende 150 banderas",
		"🧭",
		150,
	),
	learnedCountAchievement(
		"vuelta_al_mundo",
		"La vuelta al mundo",
		`Aprende las ${countries.length} banderas del mundo`,
		"🌍",
		countries.length,
	),

	// ── Continentes — retroactivos. América va agrupada: Norteamérica sola
	//    son 3 países y sería un regalo. ──
	regionAchievement(
		"dueno_de_europa",
		"Dueño de Europa",
		"🏰",
		["europe"],
		"Europa",
	),
	regionAchievement(
		"alma_de_africa",
		"Alma de África",
		"🦁",
		["africa"],
		"África",
	),
	regionAchievement(
		"travesia_de_asia",
		"Travesía de Asia",
		"🏯",
		["asia"],
		"Asia",
	),
	regionAchievement(
		"america_completa",
		"América completa",
		"🌎",
		AMERICAS_REGIONS,
		"América",
	),
	regionAchievement(
		"oceania_y_sus_islas",
		"Oceanía y sus islas",
		"🏝️",
		["oceania"],
		"Oceanía",
	),

	// ── Velocidad ──
	{
		id: "a_contrarreloj",
		name: "A contrarreloj",
		description: "Termina una partida en modo competitivo",
		emoji: "⏱️",
		category: "velocidad",
		evaluate: (data) => flag(Object.keys(data.regionBestTimes).length > 0),
	},
	{
		id: "vuelta_rapida",
		name: "Vuelta rápida",
		// 🔸 umbral a confirmar
		description: "Recorre todo el mundo en menos de 15 minutos",
		emoji: "🏎️",
		category: "velocidad",
		evaluate: (data) => {
			const worldBest = data.regionBestTimes.world;

			return flag(worldBest !== undefined && worldBest <= 15 * MINUTE_MS);
		},
	},
	{
		id: "rush_impecable",
		name: "Rush impecable",
		// 🔸 umbral a confirmar
		description:
			"Termina un competitivo de 20 banderas o más sin fallar ninguna",
		emoji: "🎯",
		category: "velocidad",
		evaluate: (data) =>
			flag(
				data.sessionHistory.some(
					(session) =>
						session.mode === "competitive" &&
						session.totalCountries >= 20 &&
						session.correctAnswers === session.totalCountries,
				),
			),
	},
	{
		id: "sin_frenos",
		name: "Sin frenos",
		// 🔸 umbral a confirmar
		description:
			"Termina un competitivo de 20 banderas o más sin saltarte ninguna",
		emoji: "🚀",
		category: "velocidad",
		evaluate: (data) =>
			flag(
				data.sessionHistory.some(
					(session) =>
						session.mode === "competitive" &&
						session.totalCountries >= 20 &&
						session.skippedAnswers === 0,
				),
			),
	},

	// ── Precisión ──
	{
		id: "diez_perfecto",
		name: "Diez perfecto",
		description: "Saca un 10 en una práctica por continente",
		emoji: "🔟",
		category: "precision",
		evaluate: (data) =>
			flag(
				Object.values(data.regionGameScores)
					.flat()
					.some((score) => score === 10),
			),
	},
	{
		id: "cinco_veces_impecable",
		name: "Cinco veces impecable",
		// 🔸 umbral a confirmar
		description: "Completa 5 sesiones sin fallar una sola bandera",
		emoji: "✨",
		category: "precision",
		evaluate: (data) => ({ current: data.stats.perfectSessions, target: 5 }),
	},
	{
		id: "pulso_firme",
		name: "Pulso firme",
		// 🔸 umbral a confirmar
		description: "Acierta 500 banderas en total",
		emoji: "🎖️",
		category: "precision",
		evaluate: (data) => ({ current: data.stats.totalCorrect, target: 500 }),
	},
	{
		id: "precision_de_relojero",
		name: "Precisión de relojero",
		// 🔸 umbrales a confirmar
		description: "Mantén un 90 % de aciertos tras 200 respuestas",
		emoji: "⚖️",
		category: "precision",
		evaluate: (data) => {
			const { totalAnswers, totalCorrect } = data.stats;

			return flag(totalAnswers >= 200 && totalCorrect / totalAnswers >= 0.9);
		},
	},

	// ── Constancia ──
	{
		id: "dos_dias_seguidos",
		name: "Dos días seguidos",
		description: "Practica dos días consecutivos",
		emoji: "📅",
		category: "constancia",
		evaluate: (data) => ({
			current: getCurrentStreak(data.stats.activeDays),
			target: 2,
		}),
	},
	{
		id: "semana_completa",
		name: "Semana completa",
		description: "Practica siete días consecutivos",
		emoji: "🗓️",
		category: "constancia",
		evaluate: (data) => ({
			current: getCurrentStreak(data.stats.activeDays),
			target: 7,
		}),
	},
	{
		id: "mes_sin_fallar",
		name: "Un mes sin fallar",
		description: "Practica treinta días consecutivos",
		emoji: "🔥",
		category: "constancia",
		evaluate: (data) => ({
			current: getCurrentStreak(data.stats.activeDays),
			target: 30,
		}),
	},
	{
		id: "veterano",
		name: "Veterano",
		// 🔸 umbral a confirmar
		description: "Practica 100 días en total, seguidos o no",
		emoji: "🏛️",
		category: "constancia",
		evaluate: (data) => ({
			current: data.stats.activeDays.length,
			target: 100,
		}),
	},
	{
		id: "kilometros_de_carrera",
		name: "Kilómetros de carrera",
		// 🔸 umbral a confirmar
		description: "Acumula 10 horas de práctica",
		emoji: "⏳",
		category: "constancia",
		evaluate: (data) => ({
			current: data.stats.totalTimePlayedMs,
			target: 10 * HOUR_MS,
		}),
	},

	// ── Meta — lee el propio conjunto de desbloqueados, de ahí el punto fijo ──
	{
		id: "coleccionista",
		name: "Coleccionista",
		description: "Desbloquea 10 logros",
		emoji: "🏅",
		category: "meta",
		evaluate: (_data, unlockedIds) => ({
			current: unlockedIds.size,
			target: 10,
		}),
	},
];

export function isUnlocked(progress: AchievementProgress): boolean {
	return progress.current >= progress.target;
}

/**
 * Devuelve los ids que acaban de cumplirse y todavía no estaban sellados.
 *
 * Resuelve el punto fijo internamente: un logro meta ("desbloquea 10 logros")
 * puede habilitarse por lo que se desbloqueó en la pasada anterior, y así todo
 * se sella en un único `dispatch` en vez de uno por pasada. El límite de
 * iteraciones es una red de seguridad por si alguien rompe la invariante de
 * monotonía documentada arriba.
 */
export function getNewlyUnlocked(data: UserLearningData): string[] {
	const unlockedIds = new Set<string>(Object.keys(data.achievements));
	const newlyUnlocked: string[] = [];

	for (let pass = 0; pass <= ACHIEVEMENTS.length; pass += 1) {
		let changedInPass = false;

		for (const achievement of ACHIEVEMENTS) {
			if (unlockedIds.has(achievement.id)) continue;

			if (isUnlocked(achievement.evaluate(data, unlockedIds))) {
				unlockedIds.add(achievement.id);
				newlyUnlocked.push(achievement.id);
				changedInPass = true;
			}
		}

		if (!changedInPass) break;
	}

	return newlyUnlocked;
}
