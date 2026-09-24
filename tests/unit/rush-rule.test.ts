/**
 * La regla de castigo 2 del competitivo (+10 s / +20 s, D075) y el ranking
 * que arranca de cero con ella (D076). Lo que se protege:
 *
 * - Una marca de "Todo el mundo" hecha con la regla vieja (`world`) nunca
 *   llega a la clave de la regla vigente (`world@2`) de Banderas y Capitales:
 *   ni al fusionar con la nube, ni con otro dispositivo, ni desde la base, ni
 *   con un invitado que entra (D056).
 * - Un cliente viejo (el SW lo mantiene en caché) conserva `world@2` sin
 *   tocarlo: solo escribe en `world`.
 * - Países no cambió de regla: su `world` sigue siendo su marca.
 * - La fusión sigue siendo idempotente.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import {
	GAME_TYPES,
	LEADERBOARD_SCOPES,
	RUSH_SKIP_PENALTY_MS,
	RUSH_WRONG_PENALTY_MS,
	WORLD_BEST_TIME_KEYS,
} from "@/types/country";
import type { RegionBestTimes, UserLearningData } from "@/types/progress";
import { getNewlyUnlocked } from "@/utils/achievements";
import {
	createDefaultLearningData,
	fromGameView,
	getAnyRuleWorldBestTime,
	getBestTimeKey,
	getGameProgress,
	getWorldBestTime,
	mergeLearningData,
	normalizeLearningData,
	planSync,
	registerRegionBestTime,
	registerRegionGame,
	toGameView,
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

/** `data` con los mejores tiempos de Banderas y Capitales sustituidos. */
function withBestTimes(
	data: UserLearningData,
	flags: RegionBestTimes,
	capitals: RegionBestTimes = {},
	countries: RegionBestTimes = {},
): UserLearningData {
	return {
		...data,
		regionBestTimes: flags,
		countriesGame: { ...data.countriesGame, regionBestTimes: countries },
		capitalsGame: { ...data.capitalsGame, regionBestTimes: capitals },
	};
}

/** Una cuenta con algo de progreso, para que `planSync` la trate como tal. */
function accountWithProgress(): UserLearningData {
	return registerRegionGame(
		createDefaultLearningData(),
		"europe",
		7,
		"2026-09-01T10:00:00.000Z",
	);
}

/**
 * Copia literal de `mergeRegionBestTimes` tal como está en la 1.2.0, el
 * cliente que el SW puede seguir sirviendo: así se fusionan los mejores
 * tiempos en un dispositivo que todavía no se ha actualizado.
 */
function oldClientMergeRegionBestTimes(
	remote: Record<string, number | undefined>,
	local: Record<string, number | undefined>,
): Record<string, number | undefined> {
	const merged = { ...remote };

	for (const [region, timeMs] of Object.entries(local)) {
		if (timeMs === undefined) continue;
		const current = merged[region];
		if (current === undefined || timeMs < current) {
			merged[region] = timeMs;
		}
	}

	return merged;
}

function assertSameJson(actual: unknown, expected: unknown, message?: string) {
	assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);
}

describe("la regla (D075)", () => {
	test("fallar suma 10 s y saltar 20 s", () => {
		assert.equal(RUSH_WRONG_PENALTY_MS, 10_000);
		assert.equal(RUSH_SKIP_PENALTY_MS, 20_000);
	});

	test("Banderas y Capitales estrenan clave y scope; Países se queda como estaba", () => {
		assert.equal(WORLD_BEST_TIME_KEYS.flags, "world@2");
		assert.equal(WORLD_BEST_TIME_KEYS.capitals, "world@2");
		assert.equal(WORLD_BEST_TIME_KEYS.countries, "world");

		// Los scopes viejos son los que siguen escribiendo los clientes viejos:
		// el ranking nuevo no puede leer ninguno.
		assert.notEqual(LEADERBOARD_SCOPES.flags, "world");
		assert.notEqual(LEADERBOARD_SCOPES.capitals, "capitals:world");
		assert.equal(LEADERBOARD_SCOPES.countries, "countries:world");
		assert.equal(
			new Set(Object.values(LEADERBOARD_SCOPES)).size,
			GAME_TYPES.length,
		);
	});
});

describe("la marca vieja no cuenta (D076)", () => {
	test("con solo una marca vieja, Banderas y Capitales no tienen mejor tiempo del mundo", () => {
		const data = withBestTimes(
			createDefaultLearningData(),
			{ world: 9 * MINUTE, europe: MINUTE },
			{ world: 12 * MINUTE },
			{ world: 5 * MINUTE },
		);

		assert.equal(getWorldBestTime(data.regionBestTimes, "flags"), undefined);
		assert.equal(
			getWorldBestTime(
				getGameProgress(data, "capitals").regionBestTimes,
				"capitals",
			),
			undefined,
		);
		// Países no cambió de regla: su marca sigue valiendo.
		assert.equal(
			getWorldBestTime(
				getGameProgress(data, "countries").regionBestTimes,
				"countries",
			),
			5 * MINUTE,
		);
		// Los continentes se conservan.
		assert.equal(data.regionBestTimes.europe, MINUTE);
	});

	test("un rush del mundo con la regla nueva se guarda aparte, aunque sea peor que la marca vieja", () => {
		const data = withBestTimes(createDefaultLearningData(), {
			world: 9 * MINUTE,
		});

		const updated = fromGameView(
			data,
			registerRegionBestTime(
				toGameView(data, "flags"),
				getBestTimeKey("world", "flags"),
				14 * MINUTE,
			),
			"flags",
		);

		assert.equal(
			getWorldBestTime(updated.regionBestTimes, "flags"),
			14 * MINUTE,
		);
		// La vieja queda donde estaba, sin tocar.
		assert.equal(updated.regionBestTimes.world, 9 * MINUTE);
	});

	test("en Capitales igual, y en su sub-objeto", () => {
		const data = withBestTimes(
			createDefaultLearningData(),
			{},
			{
				world: 9 * MINUTE,
			},
		);

		const updated = fromGameView(
			data,
			registerRegionBestTime(
				toGameView(data, "capitals"),
				getBestTimeKey("world", "capitals"),
				11 * MINUTE,
			),
			"capitals",
		);

		assert.equal(
			getWorldBestTime(updated.capitalsGame.regionBestTimes, "capitals"),
			11 * MINUTE,
		);
		assert.deepEqual(updated.regionBestTimes, {});
	});

	test("los continentes siguen en su clave de siempre", () => {
		assert.equal(getBestTimeKey("europe", "flags"), "europe");
		assert.equal(getBestTimeKey("world", "countries"), "world");
	});
});

describe("fusión: una marca vieja nunca resucita en la clave nueva (D076)", () => {
	test("remoto viejo + local nuevo: queda la nueva, aunque la vieja sea menor", () => {
		const base = createDefaultLearningData();
		const remote = withBestTimes(base, { world: 8 * MINUTE });
		const local = withBestTimes(base, { "world@2": 13 * MINUTE });

		const merged = mergeLearningData(remote, local, base);

		assert.equal(
			getWorldBestTime(merged.regionBestTimes, "flags"),
			13 * MINUTE,
		);
		assert.equal(merged.regionBestTimes.world, 8 * MINUTE);
	});

	test("local viejo (otro dispositivo sin actualizar) + remoto nuevo: igual", () => {
		const base = createDefaultLearningData();
		const remote = withBestTimes(base, {}, { "world@2": 15 * MINUTE });
		const local = withBestTimes(base, {}, { world: 6 * MINUTE });

		const merged = mergeLearningData(remote, local, base);

		assert.equal(
			getWorldBestTime(merged.capitalsGame.regionBestTimes, "capitals"),
			15 * MINUTE,
		);
	});

	test("desde la base tampoco: una base con la marca vieja no aporta nada nuevo", () => {
		const base = withBestTimes(createDefaultLearningData(), {
			world: 7 * MINUTE,
		});

		const merged = mergeLearningData(base, base, base);

		assert.equal(getWorldBestTime(merged.regionBestTimes, "flags"), undefined);
	});

	test("dos marcas nuevas: la menor, como siempre", () => {
		const base = createDefaultLearningData();
		const remote = withBestTimes(base, { "world@2": 13 * MINUTE });
		const local = withBestTimes(base, { "world@2": 12 * MINUTE });

		assert.equal(
			getWorldBestTime(
				mergeLearningData(remote, local, base).regionBestTimes,
				"flags",
			),
			12 * MINUTE,
		);
		assert.equal(
			getWorldBestTime(
				mergeLearningData(local, remote, base).regionBestTimes,
				"flags",
			),
			12 * MINUTE,
		);
	});

	test("idempotente con marcas de las dos reglas mezcladas", () => {
		const base = withBestTimes(
			createDefaultLearningData(),
			{ world: 9 * MINUTE, asia: 3 * MINUTE },
			{ world: 10 * MINUTE },
		);
		const remote = withBestTimes(
			base,
			{ world: 8 * MINUTE, "world@2": 14 * MINUTE, asia: 3 * MINUTE },
			{ world: 10 * MINUTE },
			{ world: 4 * MINUTE },
		);
		const local = withBestTimes(
			base,
			{ world: 9 * MINUTE, "world@2": 12 * MINUTE, asia: 2 * MINUTE },
			{ "world@2": 16 * MINUTE },
		);

		const once = mergeLearningData(remote, local, base);
		const twice = mergeLearningData(once, local, base);

		assertSameJson(twice, once);
		assert.equal(getWorldBestTime(once.regionBestTimes, "flags"), 12 * MINUTE);
		assert.equal(once.regionBestTimes.world, 8 * MINUTE);
		assert.equal(once.regionBestTimes.asia, 2 * MINUTE);
		assert.equal(
			getWorldBestTime(once.capitalsGame.regionBestTimes, "capitals"),
			16 * MINUTE,
		);
		assert.equal(
			getWorldBestTime(once.countriesGame.regionBestTimes, "countries"),
			4 * MINUTE,
		);
	});
});

describe("invitado que entra en una cuenta (D056)", () => {
	test("cuenta sin progreso: pasa lo del invitado, y su marca vieja no se convierte en nueva", () => {
		const guest = withBestTimes(
			registerRegionGame(
				createDefaultLearningData(),
				"asia",
				5,
				"2026-09-02T10:00:00.000Z",
			),
			{ world: 7 * MINUTE },
		);

		const plan = planSync(createDefaultLearningData(), guest, null);

		assert.equal(
			getWorldBestTime(plan.data.regionBestTimes, "flags"),
			undefined,
		);
	});

	test("cuenta con progreso: la marca nueva de la cuenta se queda, la del invitado no entra", () => {
		const account = withBestTimes(accountWithProgress(), {
			"world@2": 20 * MINUTE,
		});
		const guest = withBestTimes(createDefaultLearningData(), {
			"world@2": 10 * MINUTE,
			world: 5 * MINUTE,
		});

		const plan = planSync(account, guest, null);

		assert.equal(
			getWorldBestTime(plan.data.regionBestTimes, "flags"),
			20 * MINUTE,
		);
		assert.equal(plan.data.regionBestTimes.world, undefined);
	});
});

describe("clientes viejos (1.2.0, en caché del SW)", () => {
	test("al normalizar una fila se conserva la clave nueva (y una más nueva todavía)", () => {
		const row = normalizeLearningData({
			regionBestTimes: {
				world: 9 * MINUTE,
				"world@2": 12 * MINUTE,
				// Una regla que este cliente todavía no conoce.
				...({ "world@3": 30 * MINUTE } as RegionBestTimes),
			},
			capitalsGame: {
				...createDefaultLearningData().capitalsGame,
				regionBestTimes: { "world@2": 15 * MINUTE },
			},
		});

		assert.equal(row.regionBestTimes["world@2"], 12 * MINUTE);
		assert.equal(
			(row.regionBestTimes as Record<string, number>)["world@3"],
			30 * MINUTE,
		);
		assert.equal(row.capitalsGame.regionBestTimes["world@2"], 15 * MINUTE);
	});

	test("su fusión solo baja `world` y deja `world@2` como estaba en la nube", () => {
		const cloud = { world: 9 * MINUTE, "world@2": 12 * MINUTE };
		// Lo que ese dispositivo tiene: un rush nuevo con la regla vieja.
		const oldDevice = { world: 4 * MINUTE, "world@2": 12 * MINUTE };

		const pushedByOldClient = oldClientMergeRegionBestTimes(cloud, oldDevice);

		assert.equal(pushedByOldClient["world@2"], 12 * MINUTE);
		assert.equal(pushedByOldClient.world, 4 * MINUTE);

		// Y al leerlo el cliente nuevo, la marca vigente no cambia.
		const base = createDefaultLearningData();
		const merged = mergeLearningData(
			withBestTimes(base, pushedByOldClient as RegionBestTimes),
			withBestTimes(base, { "world@2": 12 * MINUTE }),
			base,
		);

		assert.equal(
			getWorldBestTime(merged.regionBestTimes, "flags"),
			12 * MINUTE,
		);
	});
});

describe("logros de 'Todo el mundo': retroactivos con cualquier regla", () => {
	test("getAnyRuleWorldBestTime toma la menor de las dos claves", () => {
		assert.equal(getAnyRuleWorldBestTime({}), undefined);
		assert.equal(
			getAnyRuleWorldBestTime({ world: 9 * MINUTE, "world@2": 12 * MINUTE }),
			9 * MINUTE,
		);
		assert.equal(
			getAnyRuleWorldBestTime({ "world@2": 12 * MINUTE }),
			12 * MINUTE,
		);
	});

	test("un rush del mundo con la regla vieja sigue desbloqueando 'Vuelta rápida' y el de Capitales", () => {
		const data = withBestTimes(
			createDefaultLearningData(),
			{ world: 14 * MINUTE },
			{ world: 40 * MINUTE },
		);

		const unlocked = new Set(getNewlyUnlocked(data));

		assert.ok(unlocked.has("vuelta_rapida"));
		assert.ok(unlocked.has("capitales_del_mundo"));
	});
});
