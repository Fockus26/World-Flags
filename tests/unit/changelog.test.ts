/**
 * Changelog y versión (D057, D058): el `CHANGELOG.md` real se entiende entero, su
 * primera entrada es la versión de `package.json` (así las dos no se
 * desincronizan), y la decisión de anunciar novedades en este dispositivo.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
	CHANGELOG_SECTIONS,
	checkRelease,
	compareVersions,
	parseChangelog,
} from "@/utils/changelog";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

const packageVersion = (
	JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
		version: string;
	}
).version;

describe("CHANGELOG.md", () => {
	const { entries, problems } = parseChangelog(
		readFileSync(join(ROOT, "CHANGELOG.md"), "utf8"),
	);

	test("sigue el formato (ver CONTRIBUTING.md › Changelog and versioning)", () => {
		assert.deepEqual(problems, []);
	});

	test("la primera entrada es la versión de package.json", () => {
		assert.ok(entries.length > 0, "hay al menos una versión");
		assert.equal(
			entries[0].version,
			packageVersion,
			"Si subes la versión en package.json, añade su entrada arriba del CHANGELOG (y al revés).",
		);
	});
});

describe("parseChangelog", () => {
	const sample = [
		"# Registro de cambios",
		"",
		"Texto de cabecera con [un enlace](https://example.com), que se ignora.",
		"",
		"## [1.1.0] - 2026-10-02",
		"",
		"### Corregido",
		"",
		"- Un arreglo.",
		"",
		"### Añadido",
		"",
		"- Una función nueva que ocupa",
		"  dos líneas en el archivo.",
		"- Otra.",
		"",
		"## [1.0.0] - 2026-09-21",
		"",
		"### Añadido",
		"",
		"- La primera.",
	].join("\n");

	const { entries, problems } = parseChangelog(sample);

	test("lee versiones, fechas y puntos, y une las líneas partidas", () => {
		assert.deepEqual(problems, []);
		assert.deepEqual(entries, [
			{
				version: "1.1.0",
				date: "2026-10-02",
				sections: [
					{
						name: "Añadido",
						items: [
							"Una función nueva que ocupa dos líneas en el archivo.",
							"Otra.",
						],
					},
					{ name: "Corregido", items: ["Un arreglo."] },
				],
			},
			{
				version: "1.0.0",
				date: "2026-09-21",
				sections: [{ name: "Añadido", items: ["La primera."] }],
			},
		]);
	});

	test("acepta finales de línea CRLF", () => {
		assert.deepEqual(parseChangelog(sample.replaceAll("\n", "\r\n")), {
			entries,
			problems,
		});
	});

	test("las secciones salen en el orden de Keep a Changelog", () => {
		assert.deepEqual(
			entries[0].sections.map((section) => section.name),
			CHANGELOG_SECTIONS.filter((name) =>
				entries[0].sections.some((section) => section.name === name),
			),
		);
	});

	function problemsOf(markdown: string): string[] {
		return parseChangelog(markdown).problems;
	}

	test("sin publicar, versión sin fecha o fecha imposible", () => {
		assert.equal(
			problemsOf("## [Sin publicar]\n\n### Añadido\n\n- x").length,
			2,
		);
		assert.equal(problemsOf("## [1.0.0]\n\n### Añadido\n\n- x").length, 2);
		assert.equal(
			problemsOf("## [1.0.0] - 2026-02-30\n\n### Añadido\n\n- x").length,
			1,
		);
	});

	test("sección desconocida, repetida, vacía o punto fuera de sección", () => {
		// Sección desconocida + su punto queda fuera + la versión sin cambios.
		assert.equal(
			problemsOf("## [1.0.0] - 2026-09-21\n\n### Added\n\n- x").length,
			3,
		);
		assert.equal(
			problemsOf(
				"## [1.0.0] - 2026-09-21\n\n### Añadido\n\n- x\n\n### Añadido\n\n- y",
			).length,
			1,
		);
		assert.equal(
			problemsOf(
				"## [1.0.0] - 2026-09-21\n\n### Añadido\n\n### Corregido\n\n- y",
			).length,
			1,
		);
		assert.equal(problemsOf("## [1.0.0] - 2026-09-21\n\n- x").length, 2);
	});

	test("formato Markdown dentro de un punto", () => {
		for (const text of ["**negrita**", "`código`", "[enlace](https://x.y)"]) {
			assert.equal(
				problemsOf(`## [1.0.0] - 2026-09-21\n\n### Añadido\n\n- Con ${text}.`)
					.length,
				1,
				text,
			);
		}
	});

	test("versiones y fechas de la más nueva a la más vieja, sin repetir", () => {
		const entry = (version: string, date: string) =>
			`## [${version}] - ${date}\n\n### Añadido\n\n- x\n`;

		assert.equal(
			problemsOf(entry("1.0.0", "2026-09-21") + entry("1.1.0", "2026-09-21"))
				.length,
			1,
		);
		assert.equal(
			problemsOf(entry("1.0.0", "2026-09-21") + entry("1.0.0", "2026-09-21"))
				.length,
			1,
		);
		assert.equal(
			problemsOf(entry("1.1.0", "2026-09-20") + entry("1.0.0", "2026-09-21"))
				.length,
			1,
		);
	});
});

describe("compareVersions", () => {
	test("compara número a número, no como texto", () => {
		assert.ok(compareVersions("1.10.0", "1.9.0") > 0);
		assert.ok(compareVersions("1.0.9", "1.0.10") < 0);
		assert.ok(compareVersions("2.0.0", "1.99.99") > 0);
		assert.equal(compareVersions("1.2.3", "1.2.3"), 0);
	});
});

describe("checkRelease", () => {
	const entries = parseChangelog(
		"## [1.1.0] - 2026-10-02\n\n### Añadido\n\n- x\n\n## [1.0.0] - 2026-09-21\n\n### Añadido\n\n- y",
	).entries;

	test("primera carga en el dispositivo: sella sin avisar", () => {
		assert.deepEqual(checkRelease(null, "1.1.0", entries), { action: "seal" });
	});

	test("valor guardado ilegible: sella sin avisar", () => {
		assert.deepEqual(checkRelease("basura", "1.1.0", entries), {
			action: "seal",
		});
	});

	test("versión nueva respecto a la vista: anuncia su entrada", () => {
		assert.deepEqual(checkRelease("1.0.0", "1.1.0", entries), {
			action: "announce",
			entry: entries[0],
		});
	});

	test("misma versión: nada", () => {
		assert.deepEqual(checkRelease("1.1.0", "1.1.0", entries), {
			action: "none",
		});
	});

	test("bundle más viejo que lo visto: nada, sin rebajar", () => {
		assert.deepEqual(checkRelease("1.1.0", "1.0.0", entries), {
			action: "none",
		});
	});

	test("versión nueva sin entrada: sella sin avisar", () => {
		assert.deepEqual(checkRelease("1.0.0", "1.2.0", entries), {
			action: "seal",
		});
	});
});
