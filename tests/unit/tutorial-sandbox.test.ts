/**
 * La partida guiada del tutorial **no puede tocar el progreso** (D071/D072).
 *
 * Es la parte de esa unidad que se rompe en silencio: el flujo normal de
 * partida persiste en cada paso (historial SRS, candado de "practicado hoy",
 * nota del continente, mejor tiempo y ranking público, estadísticas, historial
 * de sesiones, día activo de la racha y logros) y `GameEffects` sube
 * `learningData` a Supabase con cada cambio. Si alguna vez la partida de
 * ejemplo vuelve a pasar por ahí, nada en la pantalla lo delataría.
 *
 * Aquí se comprueban dos cosas distintas:
 *
 * 1. **Comportamiento**: jugar una partida guiada entera sobre el sandbox no
 *    escribe ni un byte en `localStorage`, y lo guardado queda idéntico.
 * 2. **Estructura**: ningún archivo del tutorial (ni la pantalla de práctica
 *    que monta) importa nada capaz de escribir progreso. Es lo que atrapa la
 *    regresión del futuro — un `useGame()` de vuelta dentro de la sesión.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { countries } from "@/data/countries";
import type { GameResult } from "@/types/country";
import type { UserLearningData } from "@/types/progress";
import {
	createDefaultLearningData,
	createSessionRecord,
	fromGameView,
	getLearningData,
	hasLearningProgress,
	registerRegionGame,
	registerSessionOutcome,
	saveUserProfile,
	toGameView,
	touchActiveDay,
} from "@/utils/learning-storage";
import { shouldOfferTutorial } from "@/utils/tutorial-gate";
import {
	configureSandbox,
	createSandboxLearningData,
	createSandboxState,
	exitSandboxGame,
	finishSandboxGame,
	getTutorialCountries,
	recordSandboxGrade,
	startSandboxGame,
	TUTORIAL_CONFIGURATION,
	TUTORIAL_REGION,
} from "@/utils/tutorial-sandbox";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/**
 * `localStorage` en memoria que además **cuenta las escrituras**: es lo que
 * convierte "el sandbox no debería guardar nada" en una aserción.
 */
class CountingStorage {
	private items = new Map<string, string>();

	writes = 0;

	getItem(key: string) {
		return this.items.get(key) ?? null;
	}

	setItem(key: string, value: string) {
		this.writes += 1;
		this.items.set(key, value);
	}

	removeItem(key: string) {
		this.writes += 1;
		this.items.delete(key);
	}

	clear() {
		this.items.clear();
		this.writes = 0;
	}

	/** Todo lo guardado, para comparar byte a byte. */
	snapshot(): string {
		return JSON.stringify([...this.items.entries()].sort());
	}
}

const storage = new CountingStorage();

Object.assign(globalThis, { window: { localStorage: storage } });

beforeEach(() => storage.clear());

/**
 * Un usuario con progreso de verdad, construido con las funciones reales (que
 * persisten al llamarlas): perfil, una nota de continente en Países, un día
 * activo para la racha y una sesión en el historial.
 */
function seedRealProgress(): UserLearningData {
	let data = createDefaultLearningData();

	data = saveUserProfile(data, {
		name: "Alejandro",
		avatarStyle: "fun-emoji",
		avatarSeed: "semilla",
	});

	data = fromGameView(
		data,
		registerRegionGame(toGameView(data, "countries"), "europe", 8),
		"countries",
	);

	data = touchActiveDay(data);

	data = registerSessionOutcome(
		data,
		createSessionRecord({
			finishedAt: "2026-09-20T10:00:00.000Z",
			mode: "practice",
			gameType: "countries",
			scopeKey: "europe",
			scopeLabel: "Europa",
			totalCountries: 45,
			correctAnswers: 40,
			skippedAnswers: 0,
			score: 8,
			elapsedMs: 600_000,
		}),
	);

	return data;
}

/** El resultado que produciría la partida de ejemplo al terminarse. */
const DEMO_RESULT: GameResult = {
	mode: "practice",
	gameType: "countries",
	score: 9,
	correctAnswers: 3,
	skippedAnswers: 0,
	finishedAt: "2026-09-23T12:00:00.000Z",
	elapsedMs: 42_000,
	totalCountries: 3,
	scope: TUTORIAL_CONFIGURATION.scope,
	regionBreakdown: { [TUTORIAL_REGION]: { correct: 3, total: 3 } },
};

describe("la partida de ejemplo no toca el progreso", () => {
	test("jugarla entera no escribe nada en localStorage", () => {
		seedRealProgress();

		const before = storage.snapshot();
		const writesBefore = storage.writes;

		assert.ok(
			writesBefore > 0,
			"el progreso de partida tiene que haberse guardado de verdad, o la prueba no prueba nada",
		);

		// La partida guiada, de principio a fin: se tocan los ajustes, se
		// empieza, se califican las tres tarjetas y se termina.
		let sandbox = createSandboxState();
		sandbox = configureSandbox(sandbox, {
			order: "random",
			difficulty: "hard",
			timerEnabled: true,
		});
		sandbox = startSandboxGame(sandbox);

		for (const _country of sandbox.preparedCountries) {
			sandbox = recordSandboxGrade(sandbox);
		}

		sandbox = finishSandboxGame(sandbox, DEMO_RESULT);

		// Corrió de verdad: tres tarjetas calificadas y un resultado.
		assert.equal(sandbox.gradedCount, 3);
		assert.equal(sandbox.result, DEMO_RESULT);

		// Y no escribió nada.
		assert.equal(
			storage.writes,
			writesBefore,
			"la partida guiada escribió en localStorage",
		);
		assert.equal(storage.snapshot(), before);
	});

	test("lo guardado queda byte a byte igual", () => {
		const seeded = seedRealProgress();
		const before = JSON.stringify(getLearningData());

		let sandbox = startSandboxGame(createSandboxState());
		sandbox = recordSandboxGrade(sandbox);
		sandbox = exitSandboxGame(sandbox);
		sandbox = startSandboxGame(sandbox);
		sandbox = finishSandboxGame(sandbox, DEMO_RESULT);

		assert.equal(JSON.stringify(getLearningData()), before);
		assert.equal(JSON.stringify(getLearningData()), JSON.stringify(seeded));
	});

	test("el sandbox juega sobre un progreso vacío, no sobre el del usuario", () => {
		seedRealProgress();

		const sandboxData = createSandboxLearningData();

		assert.equal(hasLearningProgress(sandboxData), false);
		assert.deepEqual(sandboxData.sessionHistory, []);
		assert.deepEqual(sandboxData.stats.activeDays, []);
		assert.deepEqual(toGameView(sandboxData, "countries").countryHistory, {});
	});

	test("los países del ejemplo son Norteamérica completa, del catálogo real", () => {
		const demoCountries = getTutorialCountries();

		assert.equal(demoCountries.length, 3);

		for (const country of demoCountries) {
			assert.equal(country.region, TUTORIAL_REGION);
			assert.ok(
				countries.some(
					(catalogCountry) => catalogCountry.code === country.code,
				),
				`${country.code} no está en el catálogo`,
			);
		}

		// El alcance de la partida guiada resuelve exactamente a esos tres.
		assert.equal(
			startSandboxGame(createSandboxState()).preparedCountries.length,
			3,
		);
	});
});

describe("cuándo se ofrece el tutorial solo", () => {
	const base = {
		hydrationStatus: "ready" as const,
		seenOnThisDevice: false,
		learningData: createDefaultLearningData(),
		isBusy: false,
	};

	test("invitado nuevo: sí", () => {
		assert.equal(shouldOfferTutorial(base), true);
	});

	test("cuenta nueva sin progreso: sí", () => {
		assert.equal(
			shouldOfferTutorial({
				...base,
				learningData: createDefaultLearningData(),
			}),
			true,
		);
	});

	test("usuario con progreso previo: no", () => {
		storage.clear();

		assert.equal(
			shouldOfferTutorial({ ...base, learningData: seedRealProgress() }),
			false,
		);
	});

	test("ya se ofreció en este dispositivo: no", () => {
		assert.equal(
			shouldOfferTutorial({ ...base, seenOnThisDevice: true }),
			false,
		);
	});

	test("progreso sin contrastar con la nube ('local'): todavía no", () => {
		// Puede ser un usuario con meses de progreso que aún no ha llegado.
		assert.equal(
			shouldOfferTutorial({ ...base, hydrationStatus: "local" }),
			false,
		);
	});

	test("con una partida o unos resultados en pantalla: no", () => {
		assert.equal(shouldOfferTutorial({ ...base, isBusy: true }), false);
	});
});

/**
 * Nombres importados que pueden acabar escribiendo progreso: las funciones de
 * `learning-storage.ts` que llaman a `saveLearningData`, las que persisten por
 * su cuenta, el hook del juego real y la subida al ranking.
 */
const FORBIDDEN_IMPORTS = new Set([
	"useGame",
	"setLearningData",
	"saveLearningData",
	"clearLearningData",
	"fromGameView",
	"saveDailyReminderAnswer",
	"saveUserProfile",
	"saveLastConfiguration",
	"updateLastConfiguration",
	"registerCountryAttempt",
	"registerCountryAttempts",
	"registerCountryPracticed",
	"registerRegionGame",
	"registerRegionBestTime",
	"registerSessionOutcome",
	"touchActiveDay",
	"sealAchievements",
	"markAchievementsSeen",
	"saveReviewResult",
	"saveReviewResults",
	"saveSyncBase",
	"clearSyncBase",
	"syncLearningData",
	"upsertLeaderboardEntry",
	// La preferencia de sonido (D081): la partida guiada suena, pero solo lee.
	"saveSoundEnabled",
	"useSoundPreference",
]);

/**
 * Los nombres que cada `import` trae al archivo. Se miran los imports y no el
 * cuerpo a propósito: es donde ESM obliga a declarar todo lo que entra, y así
 * los comentarios (que sí nombran `useGame` para explicar por qué NO está) no
 * dan falsos positivos.
 */
function importedNames(source: string): string[] {
	const names: string[] = [];

	const pattern =
		/import\s+(?:type\s+)?(?:\{([^}]*)\}|([A-Za-z0-9_$]+))\s*from\s*["'][^"']+["']/g;

	for (const match of source.matchAll(pattern)) {
		const [, namedGroup, defaultName] = match;

		if (defaultName) {
			names.push(defaultName);
			continue;
		}

		for (const entry of (namedGroup ?? "").split(",")) {
			const name = entry
				.trim()
				.replace(/^type\s+/, "")
				.split(/\s+as\s+/)[0]
				.trim();

			if (name) names.push(name);
		}
	}

	return names;
}

function listTutorialFiles(): string[] {
	const tutorialDir = join(ROOT, "src", "components", "game", "tutorial");

	const files = readdirSync(tutorialDir).map((name) => join(tutorialDir, name));

	return [
		...files,
		join(ROOT, "src", "hooks", "useSandboxRuntime.ts"),
		join(ROOT, "src", "hooks", "useTutorial.ts"),
		join(ROOT, "src", "utils", "tutorial-sandbox.ts"),
		join(ROOT, "src", "utils", "tutorial-gate.ts"),
		// Lo importa `CountriesPractice` para sonar: tampoco puede escribir.
		join(ROOT, "src", "utils", "sound.ts"),
		// La pantalla que monta la partida guiada: si recupera `useGame`, la
		// partida de ejemplo vuelve a escribir progreso.
		join(
			ROOT,
			"src",
			"components",
			"game",
			"session",
			"countries",
			"CountriesPractice.tsx",
		),
	];
}

describe("nada del tutorial puede escribir progreso", () => {
	const files = listTutorialFiles();

	test("hay archivos que revisar", () => {
		assert.ok(files.length >= 6);
	});

	for (const file of files) {
		const relative = file.slice(ROOT.length).replace(/\\/g, "/");

		test(`${relative} no importa nada que escriba`, () => {
			const source = readFileSync(file, "utf8");

			const offenders = importedNames(source).filter((name) =>
				FORBIDDEN_IMPORTS.has(name),
			);

			assert.deepEqual(
				offenders,
				[],
				`${relative} importa ${offenders.join(", ")}: la partida guiada podría escribir progreso`,
			);
		});
	}

	test("CountriesPractice recibe el runtime como prop obligatoria", () => {
		const source = readFileSync(
			join(
				ROOT,
				"src",
				"components",
				"game",
				"session",
				"countries",
				"CountriesPractice.tsx",
			),
			"utf8",
		);

		// Declarada sin `?` y sin valor por defecto: cualquiera de las dos
		// cosas sería la vía por la que se olvidaría inyectarlo y la partida
		// guiada volvería a caer en el juego real sin que nada fallara.
		assert.match(source, /\bruntime:\s*SessionRuntime;/);
		assert.doesNotMatch(source, /\bruntime\?:/);
		assert.doesNotMatch(source, /\bruntime\s*=/);

		// Y se usa: llega por props, no de un hook de dentro.
		assert.match(source, /\}:\s*CountriesPracticeProps\)/);
		assert.match(source, /=\s*runtime;/);
	});
});
