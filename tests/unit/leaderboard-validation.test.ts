/**
 * Validación del ranking en el servidor (D112–D114). Lo que se protege:
 *
 * - Los mínimos por scope salen del catálogo: cada scope vigente de
 *   `LEADERBOARD_SCOPES` tiene el suyo, y es nº de países × 300 ms.
 * - Son generosos: batirlos exige teclear más rápido que cualquier humano.
 * - El SQL del trigger (`supabase/leaderboard-validacion.sql`, local: no está
 *   en git ni en CI) dice los mismos números. Si el archivo no existe, esa
 *   comprobación se salta.
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
import { GAME_TYPES, LEADERBOARD_SCOPES } from "@/types/country";
import {
	getLeaderboardMinimums,
	isLeaderboardTimeRejected,
	LEADERBOARD_MIN_MS_PER_ANSWER,
	LEADERBOARD_TIME_REJECTED_CODE,
	shouldRetryLeaderboardUpload,
} from "@/utils/leaderboard-validation";

const SQL_PATH = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"supabase",
	"leaderboard-validacion.sql",
);

/** Teclas por segundo sostenidas que ningún humano alcanza (récord ≈ 17–20). */
const INHUMAN_KEYS_PER_SECOND = 25;

/** Lo mínimo que se teclea en "Fácil": sin tildes ni signos (ver `normalize-answer.ts`). */
function typedLength(value: string): number {
	return value
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[\s.,'-]/g, "").length;
}

describe("mínimos del ranking", () => {
	test("cada scope vigente tiene mínimo = países del catálogo × 300 ms", () => {
		const minimums = getLeaderboardMinimums();

		assert.deepEqual(
			Object.keys(minimums).sort(),
			GAME_TYPES.map((gameType) => LEADERBOARD_SCOPES[gameType]).sort(),
		);

		for (const minTimeMs of Object.values(minimums)) {
			assert.equal(minTimeMs, countries.length * LEADERBOARD_MIN_MS_PER_ANSWER);
		}
	});

	test("batir el mínimo exige teclear a un ritmo inhumano", () => {
		const minimums = getLeaderboardMinimums();
		const countryKeys = countries.reduce(
			(total, country) => total + typedLength(country.name),
			0,
		);
		const capitalKeys = countries.reduce((total, country) => {
			const capital = CAPITALS[country.code];
			const options = [capital.name, ...(capital.accepted ?? [])];
			return total + Math.min(...options.map(typedLength));
		}, 0);

		// Países acepta solo al escribir; Banderas y Capitales, con Enter.
		const keysByScope: Record<string, number> = {
			[LEADERBOARD_SCOPES.countries]: countryKeys,
			[LEADERBOARD_SCOPES.flags]: countryKeys + countries.length,
			[LEADERBOARD_SCOPES.capitals]: capitalKeys + countries.length,
		};

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
