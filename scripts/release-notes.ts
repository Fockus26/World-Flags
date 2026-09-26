/**
 * Changesets con el CHANGELOG de World Flags (D135–D136). Los PRs no tocan
 * `version`, `CHANGELOG.md` ni `sw.js`: cada uno con cambio visible deja un
 * `.changeset/<desc>.md` cuyo cuerpo es un trozo del CHANGELOG (secciones
 * `### Corregido`… y sus puntos). Al publicar, `scripts/release.ts` junta esos
 * trozos en una entrada `## [x.y.z] - AAAA-MM-DD` y sube `APP_VERSION`.
 *
 * Funciones puras para que `tests/unit` las pruebe; la validación reutiliza
 * `parseChangelog`, así un changeset sigue las mismas reglas que el CHANGELOG.
 */
import {
	CHANGELOG_SECTIONS,
	type ChangelogSection,
	parseChangelog,
} from "../src/utils/changelog";

export const BUMPS = ["patch", "minor", "major"] as const;

export type Bump = (typeof BUMPS)[number];

export interface Changeset {
	/** Nombre del archivo, para señalar dónde está el problema. */
	file: string;
	bump: Bump | null;
	sections: ChangelogSection[];
	problems: string[];
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const RELEASE_LINE = /^\s*["']?([^"':]+)["']?\s*:\s*(\S+)\s*$/;
/** Ancho al que se parten los puntos, como el resto del CHANGELOG. */
const WRAP = 80;

function isBump(value: string): value is Bump {
	return (BUMPS as readonly string[]).includes(value);
}

export function parseChangeset(
	file: string,
	markdown: string,
	packageName: string,
): Changeset {
	const problems: string[] = [];
	const match = markdown.match(FRONTMATTER);

	if (!match) {
		return {
			file,
			bump: null,
			sections: [],
			problems: [`${file}: falta la cabecera "---" con el salto.`],
		};
	}

	const [, header, body] = match;
	const releases = header.split(/\r?\n/).filter((line) => line.trim() !== "");
	let bump: Bump | null = null;

	if (releases.length !== 1) {
		problems.push(`${file}: la cabecera lleva una sola línea, la del paquete.`);
	}

	const release = releases[0]?.match(RELEASE_LINE);

	if (!release || release[1].trim() !== packageName) {
		problems.push(
			`${file}: la cabecera tiene que ser "${packageName}": patch|minor|major.`,
		);
	} else if (isBump(release[2])) {
		bump = release[2];
	} else {
		problems.push(
			`${file}: salto "${release[2]}" desconocido (patch, minor o major).`,
		);
	}

	// Un changeset es el cuerpo de una versión: se valida envuelto en una.
	const parsed = parseChangelog(`## [0.0.0] - 2000-01-01\n\n${body}`);
	const sections = parsed.entries[0]?.sections ?? [];

	// Sin "Línea N": contaría las líneas del envoltorio, no las del archivo.
	for (const problem of parsed.problems) {
		problems.push(`${file}: ${problem.replace(/^(Línea \d+|0\.0\.0): /, "")}`);
	}

	if (body.split(/\r?\n/).some((line) => line.startsWith("## "))) {
		problems.push(
			`${file}: sin encabezado de versión; lo pone el PR de versión.`,
		);
	}

	return { file, bump, sections, problems };
}

/** Parte un punto en líneas de `WRAP` columnas, con la sangría del CHANGELOG. */
function wrapItem(text: string): string {
	const lines: string[] = [];
	let line = "-";

	for (const word of text.split(/\s+/)) {
		if (line.length + 1 + word.length > WRAP && line.trim() !== "-") {
			lines.push(line);
			line = " ";
		}
		line = `${line} ${word}`;
	}
	lines.push(line);

	return lines.join("\n");
}

/** La entrada nueva: las secciones de todos los changesets, en orden canónico. */
export function buildEntry(
	version: string,
	date: string,
	changesets: readonly Pick<Changeset, "sections">[],
): string {
	const blocks = [`## [${version}] - ${date}`];

	for (const name of CHANGELOG_SECTIONS) {
		const items = changesets.flatMap((changeset) =>
			changeset.sections
				.filter((section) => section.name === name)
				.flatMap((section) => section.items),
		);

		if (items.length > 0) {
			blocks.push(`### ${name}`, items.map(wrapItem).join("\n"));
		}
	}

	return `${blocks.join("\n\n")}\n`;
}

/** Coloca la entrada encima de la versión más nueva (bajo la cabecera). */
export function insertEntry(changelog: string, entry: string): string {
	const eol = changelog.includes("\r\n") ? "\r\n" : "\n";
	const lines = changelog.split(/\r?\n/);
	const first = lines.findIndex((line) => line.startsWith("## "));
	const block = entry.trimEnd().split("\n");

	if (first === -1) {
		return [...lines, ...block, ""].join(eol);
	}

	return [...lines.slice(0, first), ...block, "", ...lines.slice(first)].join(
		eol,
	);
}

/** Cambia `APP_VERSION` en `public/sw.js` (D107). */
export function setServiceWorkerVersion(
	source: string,
	version: string,
): string {
	const line = /^const APP_VERSION = "[^"]+";/m;

	if (!line.test(source)) {
		throw new Error(
			'public/sw.js no tiene la línea `const APP_VERSION = "x.y.z";`',
		);
	}

	return source.replace(line, `const APP_VERSION = "${version}";`);
}
