/**
 * Aserciones de la capa pura de sincronización (`mergeLearningData` y la base
 * de sincronización). Se corren con `bun run test` (runner de Bun con la API de
 * `node:test`). Cubren los invariantes que protegen el progreso:
 *
 * - D048: `countryHistory` por la revisión más reciente de cada país.
 * - D049: perfil, configuración y notas por continente contra la base.
 * - D020: contadores por `max`, nunca suma; idempotencia del merge.
 * - D017/D021: un logro nunca se pierde, ni un id desconocido.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import type { GameConfiguration } from "@/types/country";
import type { UserLearningData } from "@/types/progress";
import {
	clearLearningData,
	createDefaultLearningData,
	createSessionRecord,
	getSyncBase,
	hasPendingChanges,
	mergeLearningData,
	registerRegionGame,
	registerSessionOutcome,
	saveSyncBase,
	saveUserProfile,
	sealAchievements,
	updateLastConfiguration,
} from "@/utils/learning-storage";
import { calculateNextReview } from "@/utils/spaced-repetition";

/** `localStorage` en memoria: las funciones `saveX` persisten al llamarlas. */
class MemoryStorage {
	private items = new Map<string, string>();

	getItem(key: string) {
		return this.items.get(key) ?? null;
	}

	setItem(key: string, value: string) {
		this.items.set(key, value);
	}

	removeItem(key: string) {
		this.items.delete(key);
	}

	clear() {
		this.items.clear();
	}
}

const storage = new MemoryStorage();

Object.assign(globalThis, { window: { localStorage: storage } });

beforeEach(() => storage.clear());

const DAY_1 = new Date("2026-09-01T10:00:00.000Z");
const DAY_2 = new Date("2026-09-02T10:00:00.000Z");
const DAY_3 = new Date("2026-09-03T10:00:00.000Z");

/** Revisa `code` en el juego indicado con la nota dada, en el instante `at`. */
function review(
	data: UserLearningData,
	code: string,
	grade: "again" | "good" | "easy",
	at: Date,
	game: "flags" | "countries" = "flags",
): UserLearningData {
	const history =
		game === "flags" ? data.countryHistory : data.countriesGame.countryHistory;

	const next = {
		...history,
		[code]: {
			review: calculateNextReview(history[code]?.review ?? null, grade, at),
		},
	};

	return game === "flags"
		? { ...data, countryHistory: next }
		: {
				...data,
				countriesGame: { ...data.countriesGame, countryHistory: next },
			};
}

function session(finishedAt: Date, correct: number, total: number) {
	return createSessionRecord({
		finishedAt: finishedAt.toISOString(),
		mode: "practice",
		gameType: "flags",
		scopeKey: "europe",
		scopeLabel: "Europa",
		totalCountries: total,
		correctAnswers: correct,
		skippedAnswers: 0,
		score: 8,
		elapsedMs: 60_000,
	});
}

/** Lo que ya está en la nube y en los dos dispositivos antes de separarse. */
function sharedBase(): UserLearningData {
	let data = createDefaultLearningData();

	data = review(data, "fr", "good", DAY_1);
	data = review(data, "de", "good", DAY_1);
	data = review(data, "jp", "good", DAY_1);
	data = review(data, "br", "good", DAY_1, "countries");
	data = registerRegionGame(data, "europe", 7);
	data = registerRegionGame(data, "asia", 6);
	data = registerSessionOutcome(data, session(DAY_1, 7, 10));
	data = saveUserProfile(data, { ...data.profile, name: "Alejandro" });
	data = updateLastConfiguration(data, { mode: "practice" });
	data = sealAchievements(data, ["primera_sesion"], DAY_1.toISOString());

	return data;
}

/** Sesión de Europa jugada en este dispositivo sin conexión. */
function playOfflineEurope(data: UserLearningData): UserLearningData {
	let next = review(data, "fr", "again", DAY_2);
	next = review(next, "es", "good", DAY_2);
	next = review(next, "br", "easy", DAY_2, "countries");
	next = registerRegionGame(next, "europe", 9);
	next = registerSessionOutcome(next, session(DAY_2, 9, 10));
	next = saveUserProfile(next, { ...next.profile, name: "Ale" });
	return next;
}

function assertSameJson(actual: unknown, expected: unknown, message?: string) {
	assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);
}

describe("countryHistory: gana la revisión más reciente por país (D048)", () => {
	test("una revisión local más nueva gana, una más vieja no", () => {
		const base = sharedBase();
		const remote = review(base, "de", "easy", DAY_3);
		const local = review(base, "fr", "again", DAY_2);

		const merged = mergeLearningData(remote, local, base);

		assert.equal(
			merged.countryHistory.fr?.review?.lastReviewedAt,
			DAY_2.toISOString(),
		);
		assert.equal(
			merged.countryHistory.de?.review?.lastReviewedAt,
			DAY_3.toISOString(),
		);
	});

	test("unión de países: los que solo existen en un lado se conservan", () => {
		const base = sharedBase();
		const remote = review(base, "kr", "good", DAY_2);
		const local = review(base, "es", "good", DAY_2);

		const merged = mergeLearningData(remote, local, base);

		assert.ok(merged.countryHistory.kr?.review);
		assert.ok(merged.countryHistory.es?.review);
	});

	test("también en el juego de Países (D028/D029)", () => {
		const base = sharedBase();
		const local = review(base, "br", "easy", DAY_2, "countries");

		const merged = mergeLearningData(base, local, base);

		assert.equal(
			merged.countriesGame.countryHistory.br?.review?.lastReviewedAt,
			DAY_2.toISOString(),
		);
		// Sin mezclar juegos: Banderas no gana "br".
		assert.equal(merged.countryHistory.br, undefined);
	});

	test("empate: se queda lo remoto", () => {
		const base = sharedBase();
		const remote = review(base, "fr", "easy", DAY_2);
		const local = review(base, "fr", "again", DAY_2);

		const merged = mergeLearningData(remote, local, base);

		assert.equal(merged.countryHistory.fr, remote.countryHistory.fr);
	});

	test("códigos fuera del catálogo se conservan al fusionar (D040)", () => {
		const base = sharedBase();
		const local = review(base, "zz", "good", DAY_2);

		const merged = mergeLearningData(base, local, base);

		assert.ok(merged.countryHistory.zz?.review);
	});
});

describe("offline en un dispositivo: practicar → recargar → volver", () => {
	test("nada de la sesión offline se pierde", () => {
		const base = sharedBase();
		// La nube no cambió mientras tanto.
		const remote = base;
		const local = playOfflineEurope(base);

		const merged = mergeLearningData(remote, local, base);

		assertSameJson(merged.countryHistory, local.countryHistory);
		assertSameJson(merged.countriesGame, local.countriesGame);
		assert.deepEqual(merged.regionGameScores.europe, [7, 9]);
		assert.equal(merged.profile.name, "Ale");
		assert.equal(merged.sessionHistory.length, 2);
		assert.equal(merged.stats.totalSessions, 2);
		assert.deepEqual(merged.stats.activeDays, local.stats.activeDays);
	});

	test("lo fusionado es exactamente lo local (nada se duplica)", () => {
		const base = sharedBase();
		const local = playOfflineEurope(base);

		assertSameJson(mergeLearningData(base, local, base), local);
	});

	test("sin cambios locales ni remotos, el merge es la nube tal cual (no hay push)", () => {
		const base = sharedBase();

		assertSameJson(mergeLearningData(base, base, base), base);
	});
});

describe("dos dispositivos con cambios distintos", () => {
	function scenario() {
		const base = sharedBase();

		// Dispositivo B (con red): Asia, otra configuración, un logro, Japón.
		let remote = review(base, "jp", "easy", DAY_3);
		remote = registerRegionGame(remote, "asia", 10);
		remote = updateLastConfiguration(remote, { mode: "competitive" });
		remote = registerSessionOutcome(remote, session(DAY_3, 10, 10));
		remote = sealAchievements(remote, ["sesion_perfecta"], DAY_3.toISOString());

		// Dispositivo A (este, sin red): Europa y un nombre nuevo.
		let local = playOfflineEurope(base);
		local = sealAchievements(
			local,
			["logro_de_una_version_nueva"],
			DAY_2.toISOString(),
		);

		return { base, remote, local };
	}

	test("se conservan los cambios de los dos", () => {
		const { base, remote, local } = scenario();

		const merged = mergeLearningData(remote, local, base);

		// Revisiones de los dos, cada una la más reciente de su país.
		assert.equal(
			merged.countryHistory.fr?.review?.lastReviewedAt,
			DAY_2.toISOString(),
		);
		assert.equal(
			merged.countryHistory.es?.review?.lastReviewedAt,
			DAY_2.toISOString(),
		);
		assert.equal(
			merged.countryHistory.jp?.review?.lastReviewedAt,
			DAY_3.toISOString(),
		);
		// Europa la cambió A, Asia la cambió B.
		assert.deepEqual(merged.regionGameScores.europe, [7, 9]);
		assert.deepEqual(merged.regionGameScores.asia, [6, 10]);
		// Perfil lo cambió A; configuración la cambió B.
		assert.equal(merged.profile.name, "Ale");
		assert.equal(merged.lastConfiguration?.mode, "competitive");
		// Logros de los dos, incluido un id que este cliente no conoce (D021).
		assert.ok(merged.achievements.primera_sesion);
		assert.ok(merged.achievements.sesion_perfecta);
		assert.ok(merged.achievements.logro_de_una_version_nueva);
		// Sesiones de los dos: el contador sale del historial fusionado, sin sumar.
		assert.equal(merged.sessionHistory.length, 3);
		assert.equal(merged.stats.totalSessions, 3);
		assert.equal(merged.stats.perfectSessions, 1);
	});

	test("el orden de llegada no cambia el resultado de los datos con marca de tiempo", () => {
		const { base, remote, local } = scenario();

		const aFirst = mergeLearningData(remote, local, base);
		// B sincroniza después contra lo que subió A (su base sigue siendo la común).
		const bAfter = mergeLearningData(aFirst, remote, base);

		assertSameJson(bAfter.countryHistory, aFirst.countryHistory);
		assertSameJson(bAfter.sessionHistory, aFirst.sessionHistory);
		assertSameJson(bAfter.achievements, aFirst.achievements);
		assert.deepEqual(bAfter.regionGameScores, aFirst.regionGameScores);
		assert.equal(bAfter.profile.name, "Ale");
		assert.equal(bAfter.lastConfiguration?.mode, "competitive");
	});

	test("límite conocido: si los dos cambian el mismo continente, gana el que sincroniza", () => {
		const base = sharedBase();
		const remote = registerRegionGame(base, "europe", 4);
		const local = registerRegionGame(base, "europe", 9);

		const merged = mergeLearningData(remote, local, base);

		assert.deepEqual(merged.regionGameScores.europe, [7, 9]);
	});
});

describe("sin base (login de invitado): D020 en lo que no tiene marca de tiempo", () => {
	test("perfil, configuración y notas: gana lo remoto", () => {
		const account = sharedBase();
		let guest = createDefaultLearningData();
		guest = saveUserProfile(guest, { ...guest.profile, name: "Invitado" });
		guest = registerRegionGame(guest, "europe", 3);
		guest = updateLastConfiguration(guest, { mode: "competitive" });

		const merged = mergeLearningData(account, guest);

		assert.equal(merged.profile.name, "Alejandro");
		assert.deepEqual(merged.regionGameScores.europe, [7]);
		assert.equal(merged.lastConfiguration?.mode, "practice");
	});

	test("revisiones: gana la más reciente, igual que el resto de campos fusionables", () => {
		const account = sharedBase();
		const guest = review(createDefaultLearningData(), "fr", "again", DAY_2);

		const merged = mergeLearningData(account, guest);

		assert.equal(merged.countryHistory.fr?.review?.repetitions, 0);
		assert.ok(merged.countryHistory.de?.review);
	});
});

describe("idempotencia: merge(merge(r, l, b), l, b) === merge(r, l, b)", () => {
	const cases: [
		string,
		() => [UserLearningData, UserLearningData, UserLearningData | null],
	][] = [
		[
			"offline, un dispositivo",
			() => {
				const base = sharedBase();
				return [base, playOfflineEurope(base), base];
			},
		],
		[
			"dos dispositivos",
			() => {
				const base = sharedBase();
				let remote = registerRegionGame(base, "asia", 10);
				remote = registerSessionOutcome(remote, session(DAY_3, 10, 10));
				return [remote, playOfflineEurope(base), base];
			},
		],
		[
			"login de invitado (sin base)",
			() => {
				const guest = playOfflineEurope(createDefaultLearningData());
				return [sharedBase(), guest, null];
			},
		],
	];

	for (const [name, build] of cases) {
		test(name, () => {
			const [remote, local, base] = build();
			const once = mergeLearningData(remote, local, base);
			const twice = mergeLearningData(once, local, base);

			assertSameJson(twice, once);
		});

		test(`${name}: diez recargas no inflan los contadores (D020)`, () => {
			const [remote, local, base] = build();
			const once = mergeLearningData(remote, local, base);

			let current = once;
			for (let reload = 0; reload < 10; reload += 1) {
				current = mergeLearningData(current, local, base);
			}

			assertSameJson(current.stats, once.stats);
			assertSameJson(current.regionGameScores, once.regionGameScores);
		});
	}
});

describe("comparación de campos sin marca de tiempo", () => {
	test("la misma configuración con las claves en otro orden no cuenta como cambio", () => {
		const base = sharedBase();
		const remote = updateLastConfiguration(base, { mode: "competitive" });
		const reordered = Object.fromEntries(
			Object.entries(base.lastConfiguration ?? {}).reverse(),
		) as unknown as GameConfiguration;
		const local = { ...base, lastConfiguration: reordered };

		const merged = mergeLearningData(remote, local, base);

		assert.equal(merged.lastConfiguration?.mode, "competitive");
	});
});

describe("base de sincronización y cambios pendientes", () => {
	test("sin base no hay nada pendiente; tras un cambio, sí", () => {
		const base = sharedBase();

		assert.equal(hasPendingChanges(base, null), false);
		assert.equal(hasPendingChanges(base, base), false);
		assert.equal(hasPendingChanges(playOfflineEurope(base), base), true);
	});

	test("la base es de una cuenta: otra cuenta no la ve", () => {
		const base = sharedBase();
		saveSyncBase("user-a", base);

		assertSameJson(getSyncBase("user-a"), base);
		assert.equal(getSyncBase("user-b"), null);
	});

	test("el logout (clearLearningData) se lleva también la base", () => {
		saveSyncBase("user-a", sharedBase());
		clearLearningData();

		assert.equal(getSyncBase("user-a"), null);
	});

	test("un logro sellado nunca se pierde al fusionar (D017)", () => {
		const base = sharedBase();
		const local = { ...base, achievements: {} };

		const merged = mergeLearningData(base, local, base);

		assert.ok(merged.achievements.primera_sesion);
	});
});
