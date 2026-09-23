/**
 * Aserciones de la capa pura de sincronización (`mergeLearningData`,
 * `planSync` y la base de sincronización). Se corren con `bun run test`
 * (runner de Bun con la API de `node:test`). Cubren los invariantes que
 * protegen el progreso:
 *
 * - D048: `countryHistory` por la revisión más reciente de cada país.
 * - D055: perfil, configuración y notas por continente por la fecha de su
 *   último cambio; sin fecha (datos viejos), contra la base (D049).
 * - D056: el invitado solo pasa a una cuenta sin progreso.
 * - D020: contadores por `max`, nunca suma; idempotencia del merge.
 * - D017/D021: un logro nunca se pierde, ni un id desconocido.
 * - D061: el registro de juegos (cada juego se lee y se escribe en su sitio).
 * - D062: un juego que este cliente no conoce se conserva y se resuelve al leer.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import {
	GAME_TYPES,
	type GameConfiguration,
	type GameType,
	isGameType,
	resolveGameType,
} from "@/types/country";
import type { UserLearningData } from "@/types/progress";
import {
	clearLearningData,
	createDefaultLearningData,
	createSessionRecord,
	fromGameView,
	getGameProgress,
	getSyncBase,
	hasLearningProgress,
	hasPendingChanges,
	mergeLearningData,
	normalizeLearningData,
	planSync,
	registerRegionGame,
	registerSessionOutcome,
	saveSyncBase,
	saveUserProfile,
	sealAchievements,
	toGameView,
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

const at = (day: Date) => day.toISOString();

/** Revisa `code` en el juego indicado con la nota dada, en el instante `day`. */
function review(
	data: UserLearningData,
	code: string,
	grade: "again" | "good" | "easy",
	day: Date,
	game: GameType = "flags",
): UserLearningData {
	const view = toGameView(data, game);
	const history = view.countryHistory;

	return fromGameView(
		data,
		{
			...view,
			countryHistory: {
				...history,
				[code]: {
					review: calculateNextReview(
						history[code]?.review ?? null,
						grade,
						day,
					),
				},
			},
		},
		game,
	);
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
	data = review(data, "pe", "good", DAY_1, "capitals");
	data = registerRegionGame(data, "europe", 7, at(DAY_1));
	data = registerRegionGame(data, "asia", 6, at(DAY_1));
	data = registerSessionOutcome(data, session(DAY_1, 7, 10));
	data = saveUserProfile(
		data,
		{ ...data.profile, name: "Alejandro" },
		at(DAY_1),
	);
	data = updateLastConfiguration(data, { mode: "practice" }, at(DAY_1));
	data = sealAchievements(data, ["primera_sesion"], at(DAY_1));

	return data;
}

/** Sesión de Europa jugada en este dispositivo sin conexión. */
function playOfflineEurope(data: UserLearningData): UserLearningData {
	let next = review(data, "fr", "again", DAY_2);
	next = review(next, "es", "good", DAY_2);
	next = review(next, "br", "easy", DAY_2, "countries");
	next = review(next, "pe", "again", DAY_2, "capitals");
	next = registerRegionGame(next, "europe", 9, at(DAY_2));
	next = registerSessionOutcome(next, session(DAY_2, 9, 10));
	next = saveUserProfile(next, { ...next.profile, name: "Ale" }, at(DAY_2));
	return next;
}

/** Datos escritos antes de D055: sin ninguna fecha de campo. */
function withoutFieldDates(data: UserLearningData): UserLearningData {
	return {
		...data,
		fieldUpdatedAt: { profile: null, lastConfiguration: null },
		regionGameScoresUpdatedAt: {},
		countriesGame: { ...data.countriesGame, regionGameScoresUpdatedAt: {} },
		capitalsGame: { ...data.capitalsGame, regionGameScoresUpdatedAt: {} },
	};
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

		assert.equal(merged.countryHistory.fr?.review?.lastReviewedAt, at(DAY_2));
		assert.equal(merged.countryHistory.de?.review?.lastReviewedAt, at(DAY_3));
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
			at(DAY_2),
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
		assert.equal(planSync(base, base, base).push, false);
	});
});

describe("dos dispositivos con cambios distintos", () => {
	function scenario() {
		const base = sharedBase();

		// Dispositivo B (con red): Asia, otra configuración, un logro, Japón.
		let remote = review(base, "jp", "easy", DAY_3);
		remote = registerRegionGame(remote, "asia", 10, at(DAY_3));
		remote = updateLastConfiguration(
			remote,
			{ mode: "competitive" },
			at(DAY_3),
		);
		remote = registerSessionOutcome(remote, session(DAY_3, 10, 10));
		remote = sealAchievements(remote, ["sesion_perfecta"], at(DAY_3));

		// Dispositivo A (este, sin red): Europa y un nombre nuevo.
		let local = playOfflineEurope(base);
		local = sealAchievements(local, ["logro_de_una_version_nueva"], at(DAY_2));

		return { base, remote, local };
	}

	test("se conservan los cambios de los dos", () => {
		const { base, remote, local } = scenario();

		const merged = mergeLearningData(remote, local, base);

		// Revisiones de los dos, cada una la más reciente de su país.
		assert.equal(merged.countryHistory.fr?.review?.lastReviewedAt, at(DAY_2));
		assert.equal(merged.countryHistory.es?.review?.lastReviewedAt, at(DAY_2));
		assert.equal(merged.countryHistory.jp?.review?.lastReviewedAt, at(DAY_3));
		// Europa la cambió A, Asia la cambió B; cada una con su fecha.
		assert.deepEqual(merged.regionGameScores.europe, [7, 9]);
		assert.deepEqual(merged.regionGameScores.asia, [6, 10]);
		assert.equal(merged.regionGameScoresUpdatedAt.europe, at(DAY_2));
		assert.equal(merged.regionGameScoresUpdatedAt.asia, at(DAY_3));
		// Perfil lo cambió A; configuración la cambió B.
		assert.equal(merged.profile.name, "Ale");
		assert.equal(merged.lastConfiguration?.mode, "competitive");
		assert.deepEqual(merged.fieldUpdatedAt, {
			profile: at(DAY_2),
			lastConfiguration: at(DAY_3),
		});
		// Logros de los dos, incluido un id que este cliente no conoce (D021).
		assert.ok(merged.achievements.primera_sesion);
		assert.ok(merged.achievements.sesion_perfecta);
		assert.ok(merged.achievements.logro_de_una_version_nueva);
		// Sesiones de los dos: el contador sale del historial fusionado, sin sumar.
		assert.equal(merged.sessionHistory.length, 3);
		assert.equal(merged.stats.totalSessions, 3);
		assert.equal(merged.stats.perfectSessions, 1);
	});

	test("el orden de llegada no cambia el resultado", () => {
		const { base, remote, local } = scenario();

		const aFirst = mergeLearningData(remote, local, base);
		// B sincroniza después contra lo que subió A (su base sigue siendo la común).
		const bAfter = mergeLearningData(aFirst, remote, base);

		assertSameJson(bAfter, aFirst);
	});
});

describe("mismo campo en los dos dispositivos: gana el cambio más reciente (D055)", () => {
	test("notas del mismo continente: la lista más nueva, venga de donde venga", () => {
		const base = sharedBase();
		const earlier = registerRegionGame(base, "europe", 9, at(DAY_2));
		const later = registerRegionGame(base, "europe", 4, at(DAY_3));

		// La nube tiene el cambio más nuevo: gana aunque lo local también cambió.
		assert.deepEqual(
			mergeLearningData(later, earlier, base).regionGameScores.europe,
			[7, 4],
		);
		// Y al revés: lo local es más nuevo que la nube.
		assert.deepEqual(
			mergeLearningData(earlier, later, base).regionGameScores.europe,
			[7, 4],
		);
	});

	test("nombre y configuración: el más reciente", () => {
		const base = sharedBase();
		let remote = saveUserProfile(
			base,
			{ ...base.profile, name: "Nube" },
			at(DAY_3),
		);
		remote = updateLastConfiguration(
			remote,
			{ mode: "competitive" },
			at(DAY_2),
		);
		let local = saveUserProfile(
			base,
			{ ...base.profile, name: "Local" },
			at(DAY_2),
		);
		local = updateLastConfiguration(local, { order: "random" }, at(DAY_3));

		const merged = mergeLearningData(remote, local, base);

		assert.equal(merged.profile.name, "Nube");
		assert.equal(merged.lastConfiguration?.order, "random");
		assert.equal(merged.lastConfiguration?.mode, "practice");
	});

	test("las fechas de Países viajan con Países (toGameView/fromGameView)", () => {
		const base = sharedBase();
		const view = registerRegionGame(
			toGameView(base, "countries"),
			"africa",
			8,
			at(DAY_2),
		);
		const local = fromGameView(base, view, "countries");

		assert.deepEqual(local.countriesGame.regionGameScores.africa, [8]);
		assert.equal(
			local.countriesGame.regionGameScoresUpdatedAt.africa,
			at(DAY_2),
		);
		// Banderas no se entera.
		assert.equal(local.regionGameScores.africa, undefined);
		assertSameJson(
			local.regionGameScoresUpdatedAt,
			base.regionGameScoresUpdatedAt,
		);

		const merged = mergeLearningData(base, local, base);

		assert.deepEqual(merged.countriesGame.regionGameScores.africa, [8]);
	});
});

describe("datos anteriores a las fechas (D055): se decide contra la base (D049)", () => {
	test("sin fechas, un cambio local respecto a la base gana; si no, la nube", () => {
		const base = withoutFieldDates(sharedBase());
		const remote = withoutFieldDates({
			...updateLastConfiguration(base, { mode: "competitive" }),
		});
		const local = withoutFieldDates(playOfflineEurope(base));

		const merged = mergeLearningData(remote, local, base);

		assert.deepEqual(merged.regionGameScores.europe, [7, 9]);
		assert.equal(merged.profile.name, "Ale");
		assert.equal(merged.lastConfiguration?.mode, "competitive");
	});

	test("un lado con fecha y el otro sin ella: también contra la base", () => {
		const base = withoutFieldDates(sharedBase());
		const remote = base;
		const local = playOfflineEurope(base);

		const merged = mergeLearningData(remote, local, base);

		assert.equal(merged.profile.name, "Ale");
		assert.equal(merged.fieldUpdatedAt.profile, at(DAY_2));
	});

	test("una fila vieja se normaliza sin fechas", () => {
		const { fieldUpdatedAt, regionGameScoresUpdatedAt, ...old } = sharedBase();
		const normalized = normalizeLearningData({
			...old,
			countriesGame: {
				countryHistory: {},
				regionGameScores: {},
				regionBestTimes: {},
				lastPracticeByCountry: {},
			} as unknown as UserLearningData["countriesGame"],
		});

		assert.deepEqual(normalized.fieldUpdatedAt, {
			profile: null,
			lastConfiguration: null,
		});
		assert.deepEqual(normalized.regionGameScoresUpdatedAt, {});
		assert.deepEqual(normalized.countriesGame.regionGameScoresUpdatedAt, {});
		assert.ok(fieldUpdatedAt && regionGameScoresUpdatedAt);
	});
});

describe("invitado que entra en una cuenta (D056, planSync)", () => {
	function guestData(): UserLearningData {
		let guest = createDefaultLearningData();
		guest = review(guest, "fr", "again", DAY_3);
		guest = registerRegionGame(guest, "europe", 3, at(DAY_3));
		guest = registerSessionOutcome(guest, session(DAY_3, 3, 10));
		guest = sealAchievements(guest, ["primera_sesion_invitado"], at(DAY_3));
		return guest;
	}

	test("cuenta con progreso: lo del invitado se descarta entero y no se sube nada", () => {
		const account = sharedBase();

		const plan = planSync(account, guestData(), null);

		assert.equal(plan.discardedLocal, true);
		assert.equal(plan.push, false);
		assertSameJson(plan.data, account);
	});

	test("cuenta sin progreso: lo del invitado pasa a ser la cuenta", () => {
		const guest = guestData();

		const plan = planSync(createDefaultLearningData(), guest, null);

		assert.equal(plan.discardedLocal, false);
		assert.equal(plan.push, true);
		assertSameJson(plan.data, guest);
	});

	test("cuenta sin fila en la nube: lo mismo, pasa a ser la cuenta", () => {
		const guest = guestData();

		const plan = planSync(null, guest, null);

		assert.equal(plan.push, true);
		assertSameJson(plan.data, guest);
	});

	test("con base (datos de esta misma cuenta): se fusiona y se sube si aporta", () => {
		const base = sharedBase();
		const local = playOfflineEurope(base);

		const plan = planSync(base, local, base);

		assert.equal(plan.discardedLocal, false);
		assert.equal(plan.push, true);
		assertSameJson(plan.data, local);
	});
});

describe("idempotencia: merge(merge(r, l, b), l, b) === merge(r, l, b)", () => {
	const cases: [
		string,
		() => [UserLearningData, UserLearningData, UserLearningData],
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
				let remote = registerRegionGame(base, "asia", 10, at(DAY_3));
				remote = registerSessionOutcome(remote, session(DAY_3, 10, 10));
				return [remote, playOfflineEurope(base), base];
			},
		],
		[
			"mismo continente en los dos",
			() => {
				const base = sharedBase();
				return [
					registerRegionGame(base, "europe", 4, at(DAY_3)),
					registerRegionGame(base, "europe", 9, at(DAY_2)),
					base,
				];
			},
		],
		[
			"datos sin fechas (anteriores a D055)",
			() => {
				const base = withoutFieldDates(sharedBase());
				return [base, withoutFieldDates(playOfflineEurope(base)), base];
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

describe("comparación de campos sin fecha", () => {
	test("la misma configuración con las claves en otro orden no cuenta como cambio", () => {
		const base = withoutFieldDates(sharedBase());
		const remote = withoutFieldDates(
			updateLastConfiguration(base, { mode: "competitive" }),
		);
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

describe("registro de juegos (D061)", () => {
	test("Banderas se lee del primer nivel; los demás, de su sub-objeto", () => {
		const data = sharedBase();

		assert.equal(
			getGameProgress(data, "flags").countryHistory,
			data.countryHistory,
		);
		assert.equal(getGameProgress(data, "countries"), data.countriesGame);
	});

	test("ida y vuelta por la vista de cada juego no cambia nada", () => {
		const data = sharedBase();

		for (const gameType of GAME_TYPES) {
			assertSameJson(
				fromGameView(data, toGameView(data, gameType), gameType),
				data,
				gameType,
			);
		}
	});

	test("escribir en la vista de un juego solo toca ese juego", () => {
		const data = sharedBase();

		for (const gameType of GAME_TYPES) {
			const view = registerRegionGame(
				toGameView(data, gameType),
				"oceania",
				10,
				at(DAY_2),
			);
			const result = fromGameView(data, view, gameType);

			for (const other of GAME_TYPES) {
				if (other === gameType) {
					assert.deepEqual(
						getGameProgress(result, other).regionGameScores.oceania,
						[10],
					);
				} else {
					assertSameJson(
						getGameProgress(result, other),
						getGameProgress(data, other),
						`${gameType} no debe tocar ${other}`,
					);
				}
			}
		}
	});

	test("normalize y merge dejan las claves en el mismo orden", () => {
		const base = sharedBase();
		const merged = mergeLearningData(base, playOfflineEurope(base), base);

		assert.deepEqual(
			Object.keys(merged),
			Object.keys(normalizeLearningData({})),
		);
	});

	test("una cuenta con progreso en un solo juego, el que sea, no la pisa el invitado (D056)", () => {
		const guest = registerRegionGame(
			createDefaultLearningData(),
			"asia",
			3,
			at(DAY_3),
		);

		for (const gameType of GAME_TYPES) {
			const empty = createDefaultLearningData();
			const account = fromGameView(
				empty,
				registerRegionGame(toGameView(empty, gameType), "europe", 8, at(DAY_1)),
				gameType,
			);

			assert.equal(hasLearningProgress(account), true, gameType);
			assert.equal(
				planSync(account, guest, null).discardedLocal,
				true,
				gameType,
			);
		}
	});
});

describe("Capitales en el modelo de datos (D061, D062)", () => {
	test("una fila sin capitales (vieja, o con la columna recién creada) da un progreso vacío válido", () => {
		for (const capitalsGame of [undefined, {}]) {
			const data = normalizeLearningData({
				countriesGame: sharedBase().countriesGame,
				capitalsGame: capitalsGame as never,
			});

			assert.deepEqual(data.capitalsGame, {
				countryHistory: {},
				regionGameScores: {},
				regionBestTimes: {},
				lastPracticeByCountry: {},
				regionGameScoresUpdatedAt: {},
			});
		}
	});

	test("va justo después de Países en la fila (orden de claves)", () => {
		const keys = Object.keys(normalizeLearningData({}));

		assert.equal(
			keys.indexOf("capitalsGame"),
			keys.indexOf("countriesGame") + 1,
		);
	});

	test("se fusiona por la revisión más reciente, sin mezclarse con los otros juegos (D048)", () => {
		const base = sharedBase();
		const local = review(base, "cl", "good", DAY_2, "capitals");

		const merged = mergeLearningData(base, local, base);

		assert.ok(merged.capitalsGame.countryHistory.cl);
		assert.equal(merged.countriesGame.countryHistory.cl, undefined);
		assert.equal(merged.countryHistory.cl, undefined);
	});

	test("un juego que este cliente no conoce se conserva en la configuración", () => {
		const data = normalizeLearningData({
			lastConfiguration: {
				...sharedBase().lastConfiguration,
				gameType: "geografia",
			} as never,
		});

		assert.equal(data.lastConfiguration?.gameType, "geografia");
		assert.equal(isGameType("geografia"), false);
		assert.equal(resolveGameType("geografia"), "countries");
	});

	test("resolveGameType deja pasar los juegos conocidos y sin configuración da el de usuario nuevo", () => {
		for (const gameType of GAME_TYPES) {
			assert.equal(resolveGameType(gameType), gameType);
		}

		assert.equal(resolveGameType(undefined), "countries");
	});
});
