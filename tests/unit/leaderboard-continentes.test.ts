/**
 * Ranking por continente (D137–D140). Lo que se protege:
 *
 * - En Banderas y Capitales las marcas de continente van a `"<región>@2"`
 *   (regla de castigo 2): la clave de siempre (`"europe"`) mezcla reglas y se
 *   queda en los datos sin leerse ni subirse. Países sigue en `"europe"`.
 * - Las claves que este cliente no conoce se conservan al normalizar y al
 *   fusionar (un cliente viejo o uno más nuevo escriben en otras).
 * - 27 scopes de ranking, uno por juego y alcance, sin repetir; "Todo el
 *   mundo" no cambia.
 * - La cola de subida: en serie, con espera creciente tras un fallo, sin
 *   reintentar un rechazo, y sin subir tiempos imposibles (P14, P15).
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import {
	BEST_TIME_RULE_SUFFIXES,
	GAME_TYPES,
	getLeaderboardScope,
	LEADERBOARD_REGIONS,
	LEADERBOARD_SCOPES,
	REGIONS,
	WORLD_BEST_TIME_KEYS,
} from "@/types/country";
import type { RegionBestTimes, UserLearningData } from "@/types/progress";
import {
	collectLeaderboardMarks,
	createLeaderboardUploadQueue,
	getLeaderboardRetryDelay,
	LEADERBOARD_RETRY_DELAYS_MS,
	type LeaderboardMark,
} from "@/utils/leaderboard-upload";
import type { LeaderboardUploadResult } from "@/utils/leaderboard-validation";
import {
	createDefaultLearningData,
	getBestTimeKey,
	getContinentBestTimes,
	getGameProgress,
	getRegionBestTime,
	mergeLearningData,
	normalizeLearningData,
	registerRegionBestTime,
} from "@/utils/learning-storage";

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

const MINUTE = 60_000;

/** `data` con los mejores tiempos de cada juego sustituidos. */
function withBestTimes(
	flags: RegionBestTimes,
	capitals: RegionBestTimes = {},
	countries: RegionBestTimes = {},
): UserLearningData {
	const data = createDefaultLearningData();

	return {
		...data,
		regionBestTimes: flags,
		countriesGame: { ...data.countriesGame, regionBestTimes: countries },
		capitalsGame: { ...data.capitalsGame, regionBestTimes: capitals },
	};
}

describe("claves versionadas por continente (D137)", () => {
	test("el sufijo de cada juego va a la par de su clave de Todo el mundo", () => {
		for (const gameType of GAME_TYPES) {
			assert.equal(
				`world${BEST_TIME_RULE_SUFFIXES[gameType]}`,
				WORLD_BEST_TIME_KEYS[gameType],
			);
		}
	});

	test("un rush de Europa en Banderas se guarda en europe@2 y no toca la marca vieja", () => {
		const data = withBestTimes({ europe: MINUTE });
		const updated = registerRegionBestTime(
			data,
			getBestTimeKey("europe", "flags"),
			5 * MINUTE,
		);

		assert.equal(updated.regionBestTimes["europe@2"], 5 * MINUTE);
		assert.equal(updated.regionBestTimes.europe, MINUTE);
		assert.equal(
			getRegionBestTime(updated.regionBestTimes, "europe", "flags"),
			5 * MINUTE,
		);
	});

	test("con solo la marca vieja, el continente de Banderas no tiene mejor tiempo; el de Países sí", () => {
		const data = withBestTimes({ asia: MINUTE }, {}, { asia: 2 * MINUTE });

		assert.equal(
			getRegionBestTime(data.regionBestTimes, "asia", "flags"),
			undefined,
		);
		assert.equal(
			getRegionBestTime(
				getGameProgress(data, "countries").regionBestTimes,
				"asia",
				"countries",
			),
			2 * MINUTE,
		);
		assert.deepEqual(getContinentBestTimes(data.regionBestTimes, "flags"), {});
	});

	test("al fusionar, cada clave va por su menor tiempo y ninguna vieja pasa a la nueva", () => {
		const base = createDefaultLearningData();
		const remote = withBestTimes({ europe: MINUTE, "europe@2": 6 * MINUTE });
		const local = withBestTimes({ "europe@2": 4 * MINUTE, africa: 3 * MINUTE });
		const merged = mergeLearningData(remote, local, base);

		assert.equal(merged.regionBestTimes["europe@2"], 4 * MINUTE);
		assert.equal(merged.regionBestTimes.europe, MINUTE);
		assert.equal(merged.regionBestTimes.africa, 3 * MINUTE);
		assert.equal(merged.regionBestTimes["africa@2"], undefined);
	});

	test("normalizar y fusionar conservan claves que este cliente no conoce", () => {
		const unknown = { "europe@3": 7 * MINUTE } as RegionBestTimes;
		const row = normalizeLearningData(
			withBestTimes({ "europe@2": 5 * MINUTE, ...unknown }),
		);

		assert.equal(
			(row.regionBestTimes as Record<string, number>)["europe@3"],
			7 * MINUTE,
		);

		const merged = mergeLearningData(
			row,
			withBestTimes({ "europe@2": 6 * MINUTE }),
			createDefaultLearningData(),
		);

		assert.equal(
			(merged.regionBestTimes as Record<string, number>)["europe@3"],
			7 * MINUTE,
		);
		assert.equal(merged.regionBestTimes["europe@2"], 5 * MINUTE);
	});
});

describe("scopes del ranking (D137)", () => {
	test("27 scopes distintos; Todo el mundo no cambia", () => {
		const scopes = GAME_TYPES.flatMap((gameType) =>
			LEADERBOARD_REGIONS.map((region) =>
				getLeaderboardScope(gameType, region),
			),
		);

		assert.equal(scopes.length, 27);
		assert.equal(new Set(scopes).size, 27);

		for (const gameType of GAME_TYPES) {
			assert.equal(
				getLeaderboardScope(gameType, "world"),
				LEADERBOARD_SCOPES[gameType],
			);
		}
	});

	test("forma de los scopes de continente", () => {
		assert.equal(
			getLeaderboardScope("countries", "europe"),
			"countries:europe",
		);
		assert.equal(getLeaderboardScope("flags", "europe"), "flags:europe@2");
		assert.equal(
			getLeaderboardScope("capitals", "south-america"),
			"capitals:south-america@2",
		);
		assert.equal(LEADERBOARD_REGIONS.length, REGIONS.length + 1);
	});
});

describe("marcas que se suben (D137, D139)", () => {
	test("solo las de la regla vigente, Todo el mundo primero", () => {
		const data = withBestTimes(
			{ world: 20 * MINUTE, europe: MINUTE, "europe@2": 5 * MINUTE },
			{ "world@2": 30 * MINUTE },
			{ asia: 4 * MINUTE },
		);

		assert.deepEqual(collectLeaderboardMarks(data), [
			{ scope: "capitals:world@2", bestTimeMs: 30 * MINUTE },
			{ scope: "flags:europe@2", bestTimeMs: 5 * MINUTE },
			{ scope: "countries:asia", bestTimeMs: 4 * MINUTE },
		]);
	});

	test("un tiempo por debajo del mínimo del alcance no se sube", () => {
		// Europa: 45 países × 300 ms = 13,5 s.
		const data = withBestTimes({ "europe@2": 1_000, "world@2": 1_000 });

		assert.deepEqual(collectLeaderboardMarks(data), []);
	});
});

/** Temporizadores de mentira: se disparan a mano. */
function createFakeTimers() {
	const pending: { callback: () => void; delayMs: number }[] = [];

	return {
		pending,
		setTimer: (callback: () => void, delayMs: number) => {
			const timer = { callback, delayMs };
			pending.push(timer);
			return timer;
		},
		clearTimer: (timer: unknown) => {
			const index = pending.indexOf(timer as (typeof pending)[number]);
			if (index >= 0) pending.splice(index, 1);
		},
		/** Dispara el más antiguo y espera a que su vuelta termine. */
		async fire() {
			const timer = pending.shift();
			assert.ok(timer, "no hay reintento pendiente");
			timer.callback();
			await flush();
		},
	};
}

/** Deja correr las promesas pendientes. */
function flush() {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("cola de subida (D140)", () => {
	test("la espera crece 5 s, 15 s, 30 s y se queda en 60 s", () => {
		assert.deepEqual(
			LEADERBOARD_RETRY_DELAYS_MS,
			[5_000, 15_000, 30_000, 60_000],
		);
		assert.equal(getLeaderboardRetryDelay(0), 5_000);
		assert.equal(getLeaderboardRetryDelay(3), 60_000);
		assert.equal(getLeaderboardRetryDelay(40), 60_000);
	});

	test("sube en serie: nunca dos peticiones en vuelo", async () => {
		const marks: LeaderboardMark[] = REGIONS.map((region, index) => ({
			scope: `countries:${region}`,
			bestTimeMs: MINUTE + index,
		}));
		let inFlight = 0;
		let maxInFlight = 0;
		const uploaded: string[] = [];

		const queue = createLeaderboardUploadQueue({
			getMarks: () => marks,
			canUpload: () => true,
			upload: async (mark) => {
				inFlight += 1;
				maxInFlight = Math.max(maxInFlight, inFlight);
				await flush();
				inFlight -= 1;
				uploaded.push(mark.scope);
				return "uploaded";
			},
		});

		// Varias llamadas seguidas (cada cambio de `learningData`) no abren otra vuelta.
		await Promise.all([queue.run(), queue.run(), queue.run()]);

		assert.equal(maxInFlight, 1);
		assert.deepEqual(
			uploaded,
			marks.map((mark) => mark.scope),
		);

		// Nada nuevo: no vuelve a subir nada.
		await queue.run();
		assert.equal(uploaded.length, marks.length);
	});

	test("un fallo para la cola y reintenta con espera; otro run no la adelanta", async () => {
		const timers = createFakeTimers();
		const results: LeaderboardUploadResult[] = ["failed", "failed", "uploaded"];
		let calls = 0;

		const queue = createLeaderboardUploadQueue({
			getMarks: () => [{ scope: "flags:world@2", bestTimeMs: 20 * MINUTE }],
			canUpload: () => true,
			upload: async () => results[calls++],
			setTimer: timers.setTimer,
			clearTimer: timers.clearTimer,
		});

		await queue.run();
		assert.equal(calls, 1);
		assert.deepEqual(
			timers.pending.map((timer) => timer.delayMs),
			[5_000],
		);

		// Cada respuesta de la partida cambia `learningData`: no reintenta (P14).
		await queue.run();
		await queue.run();
		assert.equal(calls, 1);

		await timers.fire();
		assert.equal(calls, 2);
		assert.deepEqual(
			timers.pending.map((timer) => timer.delayMs),
			[15_000],
		);

		await timers.fire();
		assert.equal(calls, 3);
		assert.equal(timers.pending.length, 0);
	});

	test("un éxito reinicia la escalera de esperas", async () => {
		const timers = createFakeTimers();
		const results: LeaderboardUploadResult[] = ["failed", "uploaded", "failed"];
		let calls = 0;
		let mark = { scope: "countries:world", bestTimeMs: 20 * MINUTE };

		const queue = createLeaderboardUploadQueue({
			getMarks: () => [mark],
			canUpload: () => true,
			upload: async () => results[calls++],
			setTimer: timers.setTimer,
			clearTimer: timers.clearTimer,
		});

		await queue.run();
		await timers.fire();
		assert.equal(calls, 2);

		mark = { ...mark, bestTimeMs: 19 * MINUTE };
		await queue.run();
		assert.deepEqual(
			timers.pending.map((timer) => timer.delayMs),
			[5_000],
		);
	});

	test("un rechazo del servidor no se reintenta (D113)", async () => {
		const timers = createFakeTimers();
		let calls = 0;

		const queue = createLeaderboardUploadQueue({
			getMarks: () => [{ scope: "capitals:asia@2", bestTimeMs: 5 * MINUTE }],
			canUpload: () => true,
			upload: async () => {
				calls += 1;
				return "rejected";
			},
			setTimer: timers.setTimer,
			clearTimer: timers.clearTimer,
		});

		await queue.run();
		await queue.run();

		assert.equal(calls, 1);
		assert.equal(timers.pending.length, 0);
	});

	test("una marca mejor que llega durante la subida se sube después", async () => {
		let mark = { scope: "flags:europe@2", bestTimeMs: 6 * MINUTE };
		const uploaded: number[] = [];

		const queue = createLeaderboardUploadQueue({
			getMarks: () => [mark],
			canUpload: () => true,
			upload: async (current) => {
				if (uploaded.length === 0) {
					mark = { ...mark, bestTimeMs: 5 * MINUTE };
				}
				uploaded.push(current.bestTimeMs);
				return "uploaded";
			},
		});

		await queue.run();

		assert.deepEqual(uploaded, [6 * MINUTE, 5 * MINUTE]);
	});

	test("sin poder subir no hace nada; dispose cancela el reintento", async () => {
		const timers = createFakeTimers();
		let canUpload = false;
		let calls = 0;

		const queue = createLeaderboardUploadQueue({
			getMarks: () => [{ scope: "countries:world", bestTimeMs: 20 * MINUTE }],
			canUpload: () => canUpload,
			upload: async () => {
				calls += 1;
				return "failed";
			},
			setTimer: timers.setTimer,
			clearTimer: timers.clearTimer,
		});

		await queue.run();
		assert.equal(calls, 0);

		canUpload = true;
		await queue.run();
		assert.equal(calls, 1);
		assert.equal(timers.pending.length, 1);

		queue.dispose();
		assert.equal(timers.pending.length, 0);

		await queue.run();
		assert.equal(calls, 1);
	});
});
