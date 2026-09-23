/**
 * Los logros de Capitales (D070): se desbloquean con el progreso de
 * Capitales y solo con él, son retroactivos, y nada de Capitales desbloquea
 * un logro de Banderas o de Países (los compartidos, sin `gameType`, sí
 * pueden: leen `stats.*` de todos los juegos a propósito).
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { countries } from "@/data/countries";
import type { GameType, Region } from "@/types/country";
import type { SessionRecord, UserLearningData } from "@/types/progress";
import { ACHIEVEMENTS, getNewlyUnlocked } from "@/utils/achievements";
import {
	createDefaultLearningData,
	fromGameView,
	toGameView,
} from "@/utils/learning-storage";

Object.assign(globalThis, {
	window: {
		localStorage: {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {},
			clear: () => {},
		},
	},
});

const LEARNED = {
	review: {
		dueDate: "2026-10-01",
		intervalDays: 6,
		easeFactor: 2.5,
		repetitions: 2,
		lastReviewedAt: "2026-09-23T10:00:00.000Z",
	},
};

function codesOf(region: Region): string[] {
	return countries
		.filter((country) => country.region === region)
		.map((country) => country.code);
}

/** `data` con todos los países de `region` aprendidos en `gameType`. */
function learnRegion(
	data: UserLearningData,
	gameType: GameType,
	region: Region,
): UserLearningData {
	const view = toGameView(data, gameType);
	const countryHistory = { ...view.countryHistory };
	for (const code of codesOf(region)) countryHistory[code] = LEARNED;

	return fromGameView(data, { ...view, countryHistory }, gameType);
}

function withBestTime(
	data: UserLearningData,
	gameType: GameType,
	scope: "world" | Region,
): UserLearningData {
	const view = toGameView(data, gameType);

	return fromGameView(
		data,
		{ ...view, regionBestTimes: { ...view.regionBestTimes, [scope]: 60_000 } },
		gameType,
	);
}

const gameTypeById = new Map(
	ACHIEVEMENTS.map((achievement) => [achievement.id, achievement.gameType]),
);

/** Ningún logro de otro juego: solo de Capitales o compartidos. */
function assertOnlyCapitalsOrShared(unlocked: readonly string[]) {
	for (const id of unlocked) {
		const gameType = gameTypeById.get(id);
		assert.ok(
			gameType === undefined || gameType === "capitals",
			`${id} es de ${gameType} y lo desbloqueó progreso de Capitales`,
		);
	}
}

describe("logros de Capitales", () => {
	test("los cuatro existen y tres son de Capitales", () => {
		assert.equal(gameTypeById.get("capitales_de_europa"), "capitals");
		assert.equal(gameTypeById.get("primer_rush_de_capitales"), "capitals");
		assert.equal(gameTypeById.get("capitales_del_mundo"), "capitals");
		assert.ok(gameTypeById.has("tres_en_uno"));
		assert.equal(gameTypeById.get("tres_en_uno"), undefined);
	});

	test("Europa aprendida en Capitales: retroactivo, y no toca Banderas ni Países", () => {
		const data = learnRegion(createDefaultLearningData(), "capitals", "europe");
		const unlocked = getNewlyUnlocked(data);

		assert.ok(unlocked.includes("capitales_de_europa"));
		assert.ok(!unlocked.includes("mapa_mental_europa"));
		assertOnlyCapitalsOrShared(unlocked);
	});

	test("Europa aprendida en Banderas no desbloquea el de Capitales", () => {
		const data = learnRegion(createDefaultLearningData(), "flags", "europe");

		assert.ok(!getNewlyUnlocked(data).includes("capitales_de_europa"));
	});

	test("un rush perfecto de Capitales no desbloquea logros de rush de otros juegos", () => {
		const session: SessionRecord = {
			id: "s1",
			finishedAt: "2026-09-23T10:00:00.000Z",
			mode: "competitive",
			gameType: "capitals",
			scopeKey: "europe",
			scopeLabel: "Europa",
			totalCountries: 45,
			correctAnswers: 45,
			skippedAnswers: 0,
			score: null,
			elapsedMs: 60_000,
		};
		const data = withBestTime(
			{ ...createDefaultLearningData(), sessionHistory: [session] },
			"capitals",
			"europe",
		);
		const unlocked = getNewlyUnlocked(data);

		assert.ok(unlocked.includes("primer_rush_de_capitales"));
		assert.ok(!unlocked.includes("capitales_del_mundo"));
		assertOnlyCapitalsOrShared(unlocked);
	});

	test("el rush de capitales cuenta aunque el historial ya no lo tenga", () => {
		const data = withBestTime(createDefaultLearningData(), "capitals", "asia");

		assert.ok(getNewlyUnlocked(data).includes("primer_rush_de_capitales"));
	});

	test('"Todo el mundo" en Capitales, y solo en Capitales', () => {
		const capitals = withBestTime(
			createDefaultLearningData(),
			"capitals",
			"world",
		);
		const flags = withBestTime(createDefaultLearningData(), "flags", "world");

		assert.ok(getNewlyUnlocked(capitals).includes("capitales_del_mundo"));
		assert.ok(!getNewlyUnlocked(flags).includes("capitales_del_mundo"));
	});

	test("tres en uno: el mismo continente en los tres juegos", () => {
		let data = createDefaultLearningData();
		data = learnRegion(data, "flags", "south-america");
		data = learnRegion(data, "countries", "south-america");
		assert.ok(!getNewlyUnlocked(data).includes("tres_en_uno"));

		// Otro continente en Capitales no vale.
		const otherRegion = learnRegion(data, "capitals", "north-america");
		assert.ok(!getNewlyUnlocked(otherRegion).includes("tres_en_uno"));

		data = learnRegion(data, "capitals", "south-america");
		assert.ok(getNewlyUnlocked(data).includes("tres_en_uno"));
	});
});
