/**
 * `version-script` de la Action `release.yml` (D135): convierte los
 * changesets pendientes en la versión nueva. Lee los `.changeset/*.md`
 * antes de que `changeset version` los borre, deja que Changesets suba
 * `version` en `package.json` (su `changelog` está apagado) y escribe la
 * entrada de `CHANGELOG.md` y el `APP_VERSION` de `public/sw.js`.
 *
 * Solo lo corre la Action. A mano: `bun scripts/release.ts` en `main`.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	buildEntry,
	insertEntry,
	parseChangeset,
	setServiceWorkerVersion,
} from "./release-notes";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const at = (...parts: string[]) => join(ROOT, ...parts);

const readPackage = () =>
	JSON.parse(readFileSync(at("package.json"), "utf8")) as {
		name: string;
		version: string;
	};

const { name, version: previous } = readPackage();

const changesets = readdirSync(at(".changeset"))
	.filter((file) => file.endsWith(".md") && file !== "README.md")
	.sort()
	.map((file) =>
		parseChangeset(file, readFileSync(at(".changeset", file), "utf8"), name),
	);

if (changesets.length === 0) {
	console.log("Sin changesets: no hay versión nueva.");
	process.exit(0);
}

const problems = changesets.flatMap((changeset) => changeset.problems);

if (problems.length > 0) {
	console.error(problems.join("\n"));
	process.exit(1);
}

// `bun x` = `bunx`, con el mismo bun que corre este script.
const changesetVersion = spawnSync(
	process.execPath,
	["x", "--bun", "changeset", "version"],
	{ cwd: ROOT, stdio: "inherit" },
);

if (changesetVersion.status !== 0) process.exit(changesetVersion.status ?? 1);

const { version } = readPackage();

if (version === previous) {
	console.error(`changeset version no subió la versión (sigue en ${version}).`);
	process.exit(1);
}

// Fecha en UTC: la del día en que la Action rehízo el PR de versión.
const date = new Date().toISOString().slice(0, 10);

writeFileSync(
	at("CHANGELOG.md"),
	insertEntry(
		readFileSync(at("CHANGELOG.md"), "utf8"),
		buildEntry(version, date, changesets),
	),
);
writeFileSync(
	at("public", "sw.js"),
	setServiceWorkerVersion(readFileSync(at("public", "sw.js"), "utf8"), version),
);

console.log(`${previous} → ${version}: CHANGELOG.md y public/sw.js al día.`);
