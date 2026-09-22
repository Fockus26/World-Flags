/**
 * Precarga de banderas (D054): qué se pide y cuándo no se pide.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { getFlagUrls, shouldPrecacheFlags } from "@/utils/flag-precache";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

describe("getFlagUrls", () => {
	const urls = getFlagUrls();

	test("una por país del catálogo, sin repetir", () => {
		assert.equal(urls.length, 197);
		assert.equal(new Set(urls).size, urls.length);
	});

	test("todas existen en public/flags", () => {
		const missing = urls.filter(
			(url) => !existsSync(join(ROOT, "public", url)),
		);

		assert.deepEqual(missing, []);
	});

	test("todas pasan el filtro del service worker", () => {
		const source = readFileSync(join(ROOT, "public", "sw.js"), "utf8");
		const match = source.match(/const FLAG_URL_PATTERN = (\/.+\/);/);

		assert.ok(match, "sw.js define FLAG_URL_PATTERN");

		const pattern = new Function(`return ${match[1]}`)() as RegExp;

		assert.deepEqual(
			urls.filter((url) => !pattern.test(url)),
			[],
		);
		assert.equal(pattern.test("https://evil.example/flags/fr.svg"), false);
		assert.equal(pattern.test("/flags/../index.html"), false);
	});
});

describe("shouldPrecacheFlags", () => {
	test("sin Network Information API (Safari, Firefox): sí", () => {
		assert.equal(shouldPrecacheFlags(undefined), true);
	});

	test("conexión normal: sí", () => {
		assert.equal(shouldPrecacheFlags({ effectiveType: "4g" }), true);
		assert.equal(shouldPrecacheFlags({ effectiveType: "3g" }), true);
	});

	test("ahorro de datos o 2G: no", () => {
		assert.equal(
			shouldPrecacheFlags({ saveData: true, effectiveType: "4g" }),
			false,
		);
		assert.equal(shouldPrecacheFlags({ effectiveType: "2g" }), false);
		assert.equal(shouldPrecacheFlags({ effectiveType: "slow-2g" }), false);
	});
});
