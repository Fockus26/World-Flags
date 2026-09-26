/**
 * Validación del ranking en el servidor (D112–D114). Lo que se protege:
 *
 * - Los mínimos por scope salen del catálogo: cada uno de los 27 scopes
 *   vigentes (3 juegos × "Todo el mundo" y 8 continentes, D138) tiene el
 *   suyo, y es nº de países del alcance × 300 ms.
 * - Son generosos: batirlos exige teclear más rápido que cualquier humano.
 * - El SQL del trigger (`supabase/leaderboard-continentes.sql`, que redefine
 *   el de `leaderboard-validacion.sql`; local: no está en git ni en CI) dice
 *   los mismos números. Si el archivo no existe, esa comprobación se salta.
 * - El cliente no guarda como mejor marca un tiempo bajo el mínimo (D139).
 * - Un rechazo del servidor es definitivo (no se reintenta); un fallo de red
 *   o de servidor sí se reintenta (D050, D113).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { CAPITALS } from "@/data/capitals";
import { countries } from "@/data/countries";
import {
	GAME_TYPES,
	type GameType,
	getLeaderboardScope,
	LEADERBOARD_REGIONS,
	LEADERBOARD_SCOPES,
	REGIONS,
} from "@/types/country";
import {
	getLeaderboardMinimums,
	getRushMinTimeMs,
	isLeaderboardTimeRejected,
	isPlausibleRushTime,
	LEADERBOARD_MIN_MS_PER_ANSWER,
	LEADERBOARD_TIME_REJECTED_CODE,
	shouldRetryLeaderboardUpload,
} from "@/utils/leaderboard-validation";

const SQL_PATH = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"supabase",
	"leaderboard-continentes.sql",
);

/**
 * Teclas por segundo sostenidas que ningún humano alcanza (récord ≈ 17–20).
 * Era 25 con solo "Todo el mundo"; con los continentes (D138) el más justo es
 * Países de Sudamérica, 23,1 teclas/s (nombres cortos: Perú, Chile…), y
 * Capitales de Asia, 24,8. Siguen por encima del récord con margen.
 */
const INHUMAN_KEYS_PER_SECOND = 22;

/** Lo mínimo que se teclea en "Fácil": sin tildes ni signos (ver `normalize-answer.ts`). */
function typedLength(value: string): number {
	return value
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[\s.,'-]/g, "").length;
}

describe("mínimos del ranking", () => {
	test("los 27 scopes vigentes tienen mínimo = países del alcance × 300 ms", () => {
		const minimums = getLeaderboardMinimums();

		assert.equal(Object.keys(minimums).length, 27);

		for (const gameType of GAME_TYPES) {
			assert.equal(
				minimums[LEADERBOARD_SCOPES[gameType]],
				countries.length * LEADERBOARD_MIN_MS_PER_ANSWER,
			);

			for (const region of REGIONS) {
				const regionCount = countries.filter(
					(country) => country.region === region,
				).length;

				assert.equal(
					minimums[getLeaderboardScope(gameType, region)],
					regionCount * LEADERBOARD_MIN_MS_PER_ANSWER,
				);
			}
		}
	});

	test("los scopes viejos no tienen mínimo (D114)", () => {
		const minimums = getLeaderboardMinimums();

		for (const scope of ["world", "capitals:world", "flags:europe"]) {
			assert.equal(minimums[scope], undefined);
		}
	});

	test("batir el mínimo exige teclear a un ritmo inhumano", () => {
		const minimums = getLeaderboardMinimums();
		const keysByScope: Record<string, number> = {};

		for (const region of LEADERBOARD_REGIONS) {
			const inScope = countries.filter(
				(country) => region === "world" || country.region === region,
			);
			const countryKeys = inScope.reduce(
				(total, country) => total + typedLength(country.name),
				0,
			);
			const capitalKeys = inScope.reduce((total, country) => {
				const capital = CAPITALS[country.code];
				const options = [capital.name, ...(capital.accepted ?? [])];
				return total + Math.min(...options.map(typedLength));
			}, 0);

			// Países acepta solo al escribir; Banderas y Capitales, con Enter.
			const keys: Record<GameType, number> = {
				countries: countryKeys,
				flags: countryKeys + inScope.length,
				capitals: capitalKeys + inScope.length,
			};

			for (const gameType of GAME_TYPES) {
				keysByScope[getLeaderboardScope(gameType, region)] = keys[gameType];
			}
		}

		for (const [scope, minTimeMs] of Object.entries(minimums)) {
			const keysPerSecond = keysByScope[scope] / (minTimeMs / 1000);
			assert.ok(
				keysPerSecond > INHUMAN_KEYS_PER_SECOND,
				`${scope}: ${keysPerSecond.toFixed(1)} teclas/s no es inhumano`,
			);
		}
	});

	test("el SQL del trigger usa los mismos mínimos", {
		skip: !existsSync(SQL_PATH) && "supabase/ es local",
	}, () => {
		const sql = readFileSync(SQL_PATH, "utf8");
		const functionBody = sql.slice(0, sql.indexOf("create trigger"));
		const sqlMinimums = Object.fromEntries(
			[...functionBody.matchAll(/when '([^']+)' then (\d+)/g)].map(
				([, scope, minTimeMs]) => [scope, Number(minTimeMs)],
			),
		);

		assert.deepEqual(sqlMinimums, getLeaderboardMinimums());
		assert.ok(sql.includes(`errcode = '${LEADERBOARD_TIME_REJECTED_CODE}'`));
	});
});

describe("tiempos imposibles en el cliente (D139)", () => {
	test("un rush por debajo del mínimo de su alcance no es una marca", () => {
		assert.equal(
			isPlausibleRushTime("world", getRushMinTimeMs("world") - 1),
			false,
		);
		assert.equal(isPlausibleRushTime("world", getRushMinTimeMs("world")), true);
		assert.equal(
			isPlausibleRushTime("europe", getRushMinTimeMs("europe") - 1),
			false,
		);
		assert.equal(isPlausibleRushTime("europe", 10 * 60_000), true);
	});

	test("un tiempo negativo o no finito (reloj que salta) nunca vale", () => {
		assert.equal(isPlausibleRushTime("caribbean", -5_000), false);
		assert.equal(isPlausibleRushTime("caribbean", Number.NaN), false);
		assert.equal(
			isPlausibleRushTime("caribbean", Number.POSITIVE_INFINITY),
			false,
		);
	});
});

describe("rechazo del servidor", () => {
	test("reconoce el código del trigger y nada más", () => {
		assert.equal(isLeaderboardTimeRejected({ code: "PT422" }), true);
		assert.equal(isLeaderboardTimeRejected({ code: "P0001" }), false);
		assert.equal(isLeaderboardTimeRejected({ code: "42501" }), false);
		assert.equal(isLeaderboardTimeRejected({}), false);
	});

	test("solo se reintenta lo que falló, no lo rechazado", () => {
		assert.equal(shouldRetryLeaderboardUpload("failed"), true);
		assert.equal(shouldRetryLeaderboardUpload("rejected"), false);
		assert.equal(shouldRetryLeaderboardUpload("uploaded"), false);
	});
});
