/**
 * `public/sw.js` cambia en cada versión (D107): lleva la de `package.json`
 * en `APP_VERSION`. Si no coinciden, el navegador no ve un service worker
 * nuevo y las pestañas abiertas nunca reciben el aviso "Actualizar".
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

const packageVersion = (
	JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
		version: string;
	}
).version;

const serviceWorker = readFileSync(join(ROOT, "public", "sw.js"), "utf8");

test("sw.js declara APP_VERSION igual a la versión de package.json", () => {
	const match = serviceWorker.match(/^const APP_VERSION = "([^"]+)";\r?$/m);

	assert.ok(
		match,
		'sw.js tiene que tener la línea `const APP_VERSION = "x.y.z";`',
	);
	assert.equal(
		match[1],
		packageVersion,
		"Si subes la versión en package.json, cambia también APP_VERSION en public/sw.js.",
	);
});

test("CACHE_NAME no cambia con la versión (D054)", () => {
	assert.match(serviceWorker, /^const CACHE_NAME = "banderas-cache-v4";\r?$/m);
});
