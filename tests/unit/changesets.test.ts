/**
 * Changesets (D135–D136): los `.changeset/*.md` pendientes se entienden (así un
 * error sale en el PR que lo trae, no en el PR de versión) y el paso de
 * publicar escribe una entrada que el CHANGELOG acepta.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { parseChangelog } from "@/utils/changelog";
import {
	buildEntry,
	insertEntry,
	parseChangeset,
	setServiceWorkerVersion,
} from "../../scripts/release-notes";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const NAME = "world-flags";

describe(".changeset pendientes", () => {
	const files = readdirSync(join(ROOT, ".changeset")).filter(
		(file) => file.endsWith(".md") && file !== "README.md",
	);

	test("siguen el formato (ver .changeset/README.md)", () => {
		const problems = files.flatMap(
			(file) =>
				parseChangeset(
					file,
					readFileSync(join(ROOT, ".changeset", file), "utf8"),
					NAME,
				).problems,
		);

		assert.deepEqual(problems, []);
	});
});

describe("parseChangeset", () => {
	const changeset = (header: string, body: string) =>
		parseChangeset("x.md", `---\n${header}\n---\n\n${body}`, NAME);

	test("lee el salto y las secciones, y une las líneas partidas", () => {
		const parsed = changeset(
			'"world-flags": minor',
			"### Añadido\n\n- Una función nueva que ocupa\n  dos líneas.\n\n### Corregido\n\n- Un arreglo.\n",
		);

		assert.deepEqual(parsed.problems, []);
		assert.equal(parsed.bump, "minor");
		assert.deepEqual(parsed.sections, [
			{ name: "Añadido", items: ["Una función nueva que ocupa dos líneas."] },
			{ name: "Corregido", items: ["Un arreglo."] },
		]);
	});

	test("acepta finales de línea CRLF y comillas simples", () => {
		const parsed = parseChangeset(
			"x.md",
			"---\r\n'world-flags': patch\r\n---\r\n\r\n### Corregido\r\n\r\n- x\r\n",
			NAME,
		);

		assert.deepEqual(parsed.problems, []);
		assert.equal(parsed.bump, "patch");
	});

	test("sin cabecera, otro paquete o salto desconocido", () => {
		assert.equal(
			parseChangeset("x.md", "### Corregido\n\n- x", NAME).problems.length,
			1,
		);
		assert.equal(
			changeset('"otro": patch', "### Corregido\n\n- x").problems.length,
			1,
		);
		assert.equal(
			changeset('"world-flags": mayor', "### Corregido\n\n- x").problems.length,
			1,
		);
	});

	test("las reglas del CHANGELOG: sección válida, sin Markdown, sin versión", () => {
		const header = '"world-flags": patch';

		assert.ok(changeset(header, "### Fixed\n\n- x").problems.length > 0);
		assert.ok(changeset(header, "- x").problems.length > 0);
		assert.ok(
			changeset(header, "### Corregido\n\n- Con **negrita**.").problems.length >
				0,
		);
		assert.ok(
			changeset(header, "## [1.0.0] - 2026-09-26\n\n### Corregido\n\n- x")
				.problems.length > 0,
		);
	});
});

describe("buildEntry + insertEntry", () => {
	const changelog = [
		"# Registro de cambios",
		"",
		"Cabecera.",
		"",
		"## [1.0.0] - 2026-09-21",
		"",
		"### Añadido",
		"",
		"- La primera.",
		"",
	].join("\n");

	const long =
		"Un punto largo que pasa de ochenta columnas y por eso se parte en varias líneas sangradas como el resto.";

	const entry = buildEntry("1.1.0", "2026-09-26", [
		{ sections: [{ name: "Corregido", items: ["Un arreglo."] }] },
		{
			sections: [
				{ name: "Añadido", items: [long] },
				{ name: "Corregido", items: ["Otro arreglo."] },
			],
		},
	]);

	const result = insertEntry(changelog, entry);
	const { entries, problems } = parseChangelog(result);

	test("junta las secciones de todos en orden canónico, encima de la última", () => {
		assert.deepEqual(problems, []);
		assert.deepEqual(entries[0], {
			version: "1.1.0",
			date: "2026-09-26",
			sections: [
				{ name: "Añadido", items: [long] },
				{ name: "Corregido", items: ["Un arreglo.", "Otro arreglo."] },
			],
		});
		assert.equal(entries[1].version, "1.0.0");
		assert.ok(
			result.startsWith("# Registro de cambios\n\nCabecera.\n\n## [1.1.0]"),
		);
	});

	test("parte los puntos largos a 80 columnas", () => {
		assert.ok(result.split("\n").every((line) => line.length <= 80));
	});

	test("respeta CRLF", () => {
		const crlf = insertEntry(changelog.replaceAll("\n", "\r\n"), entry);

		assert.ok(!/[^\r]\n/.test(crlf));
		assert.deepEqual(parseChangelog(crlf).entries, entries);
	});
});

describe("setServiceWorkerVersion", () => {
	test("cambia solo APP_VERSION", () => {
		const source = 'const CACHE_NAME = "c";\nconst APP_VERSION = "1.0.0";\n';

		assert.equal(
			setServiceWorkerVersion(source, "1.1.0"),
			'const CACHE_NAME = "c";\nconst APP_VERSION = "1.1.0";\n',
		);
	});

	test("falla si la línea no está", () => {
		assert.throws(() => setServiceWorkerVersion("const X = 1;", "1.1.0"));
	});
});
