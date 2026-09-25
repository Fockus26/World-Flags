/**
 * Actualización obligatoria (D109, D110): cuándo una versión está por debajo
 * de la mínima, y que ante cualquier duda no se bloquee.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isUpdateRequired, parseVersion } from "@/utils/min-version";

describe("parseVersion", () => {
	test("acepta MAJOR.MINOR.PATCH, con espacios alrededor", () => {
		assert.equal(parseVersion("2.0.0"), "2.0.0");
		assert.equal(parseVersion(" 2.10.3\n"), "2.10.3");
	});

	test("rechaza todo lo demás", () => {
		for (const value of [
			"",
			"2",
			"2.0",
			"v2.0.0",
			"2.0.0-beta",
			"2.0.0.1",
			"2.x.0",
			"1234567.0.0",
			null,
			undefined,
			2,
			{},
		]) {
			assert.equal(parseVersion(value), null, String(value));
		}
	});
});

describe("isUpdateRequired", () => {
	test("por debajo de la mínima: bloquea", () => {
		assert.equal(isUpdateRequired("1.9.9", "2.0.0"), true);
		assert.equal(isUpdateRequired("2.2.0", "2.3.0"), true);
		assert.equal(isUpdateRequired("2.2.9", "2.2.10"), true);
	});

	test("igual o por encima: no bloquea", () => {
		assert.equal(isUpdateRequired("2.0.0", "2.0.0"), false);
		assert.equal(isUpdateRequired("2.3.0", "2.0.0"), false);
		assert.equal(isUpdateRequired("2.10.0", "2.9.0"), false);
	});

	test("compara número a número, no como texto", () => {
		assert.equal(isUpdateRequired("2.9.0", "2.10.0"), true);
		assert.equal(isUpdateRequired("10.0.0", "9.0.0"), false);
	});

	test("mínima inválida o ausente: no bloquea", () => {
		for (const minimum of [null, undefined, "", "latest", "v3.0.0", "3.0"]) {
			assert.equal(isUpdateRequired("1.0.0", minimum), false, String(minimum));
		}
	});

	test("versión actual inválida: no bloquea", () => {
		assert.equal(isUpdateRequired("dev", "2.0.0"), false);
	});
});
