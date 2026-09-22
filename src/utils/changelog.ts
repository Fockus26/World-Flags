/**
 * Lectura de `CHANGELOG.md` (formato Keep a Changelog + semver, en español).
 * Es la única fuente del modal "Novedades" (D057): el archivo se empaqueta tal
 * cual en el bundle y se interpreta aquí, así que no hay una segunda lista de
 * cambios que mantener en paralelo.
 *
 * Funciones puras (sin DOM ni `?raw`) para que `tests/unit` las corra sobre
 * el archivo real: ahí se exige `problems` vacío y que la primera entrada sea
 * la versión de `package.json`. En la app, una línea que no se entiende se
 * ignora en vez de romper el modal.
 */

/** Tipos de cambio de Keep a Changelog, en el orden en que se muestran. */
export const CHANGELOG_SECTIONS = [
	"Añadido",
	"Cambiado",
	"Obsoleto",
	"Eliminado",
	"Corregido",
	"Seguridad",
] as const;

export type ChangelogSectionName = (typeof CHANGELOG_SECTIONS)[number];

export interface ChangelogSection {
	name: ChangelogSectionName;
	items: string[];
}

export interface ChangelogEntry {
	/** `MAJOR.MINOR.PATCH`, sin prefijo `v`. */
	version: string;
	/** `AAAA-MM-DD`. */
	date: string;
	sections: ChangelogSection[];
}

export interface ParsedChangelog {
	/** De la más nueva a la más vieja, como en el archivo. */
	entries: ChangelogEntry[];
	/** Líneas que no siguen el formato. La app las ignora; los tests no. */
	problems: string[];
}

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const ENTRY_HEADING = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})\s*$/;
const SECTION_HEADING = /^### (.+?)\s*$/;
const ITEM = /^- (.+)$/;
const CONTINUATION = /^\s+(\S.*)$/;
/** El modal pinta cada punto como texto: nada de negritas, código ni enlaces. */
const INLINE_MARKDOWN = /\*\*|`|\]\(/;

function isSectionName(name: string): name is ChangelogSectionName {
	return (CHANGELOG_SECTIONS as readonly string[]).includes(name);
}

function isValidDate(date: string): boolean {
	const parsed = new Date(`${date}T00:00:00Z`);

	return (
		!Number.isNaN(parsed.getTime()) &&
		parsed.toISOString().slice(0, 10) === date
	);
}

export function isValidVersion(version: string): boolean {
	return VERSION_PATTERN.test(version);
}

/**
 * Compara dos versiones `MAJOR.MINOR.PATCH`: negativo si `a` es anterior,
 * positivo si es posterior, 0 si son iguales.
 */
export function compareVersions(a: string, b: string): number {
	const partsA = a.split(".").map(Number);
	const partsB = b.split(".").map(Number);

	for (let index = 0; index < 3; index += 1) {
		const difference = (partsA[index] ?? 0) - (partsB[index] ?? 0);
		if (difference !== 0) return difference;
	}

	return 0;
}

export function parseChangelog(markdown: string): ParsedChangelog {
	const entries: ChangelogEntry[] = [];
	const problems: string[] = [];

	let entry: ChangelogEntry | null = null;
	let section: ChangelogSection | null = null;
	// Solo se puede continuar el punto recién abierto: una línea sangrada
	// después de un encabezado o de una línea en blanco no pertenece a nada.
	let canContinue = false;

	for (const [index, line] of markdown.split(/\r?\n/).entries()) {
		const lineNumber = index + 1;

		if (line.startsWith("## ")) {
			canContinue = false;
			section = null;
			const match = line.match(ENTRY_HEADING);

			if (!match) {
				entry = null;
				problems.push(
					`Línea ${lineNumber}: encabezado de versión con otro formato (se espera "## [1.2.3] - AAAA-MM-DD").`,
				);
				continue;
			}

			const [, version, date] = match;

			if (!isValidDate(date)) {
				problems.push(`Línea ${lineNumber}: fecha inválida "${date}".`);
			}

			entry = { version, date, sections: [] };
			entries.push(entry);
			continue;
		}

		if (line.startsWith("### ")) {
			canContinue = false;
			section = null;
			const name = line.match(SECTION_HEADING)?.[1] ?? "";

			if (!entry) {
				problems.push(`Línea ${lineNumber}: sección fuera de una versión.`);
				continue;
			}

			if (!isSectionName(name)) {
				problems.push(
					`Línea ${lineNumber}: sección desconocida "${name}" (válidas: ${CHANGELOG_SECTIONS.join(", ")}).`,
				);
				continue;
			}

			if (entry.sections.some((existing) => existing.name === name)) {
				problems.push(
					`Línea ${lineNumber}: la sección "${name}" se repite en ${entry.version}.`,
				);
			}

			section = { name, items: [] };
			entry.sections.push(section);
			continue;
		}

		const item = line.match(ITEM);

		if (item) {
			if (section) {
				section.items.push(item[1].trim());
				canContinue = true;
				continue;
			}

			canContinue = false;
			// Fuera de una versión (la cabecera del archivo) un guion es prosa,
			// no un cambio: solo es un problema dentro de una versión.
			if (entry) {
				problems.push(`Línea ${lineNumber}: punto fuera de una sección.`);
			}
			continue;
		}

		const continuation = line.match(CONTINUATION);

		if (continuation && canContinue && section) {
			const last = section.items.length - 1;
			section.items[last] = `${section.items[last]} ${continuation[1].trim()}`;
			continue;
		}

		canContinue = false;
	}

	for (const current of entries) {
		if (current.sections.length === 0) {
			problems.push(`${current.version}: la versión no tiene cambios.`);
		}

		for (const currentSection of current.sections) {
			if (currentSection.items.length === 0) {
				problems.push(
					`${current.version}: la sección "${currentSection.name}" está vacía.`,
				);
			}

			for (const text of currentSection.items) {
				if (INLINE_MARKDOWN.test(text)) {
					problems.push(
						`${current.version}: "${text}" lleva formato Markdown; el modal lo mostraría tal cual.`,
					);
				}
			}
		}

		// Las secciones se muestran en el orden canónico, no en el del archivo.
		current.sections.sort(
			(a, b) =>
				CHANGELOG_SECTIONS.indexOf(a.name) - CHANGELOG_SECTIONS.indexOf(b.name),
		);
	}

	for (const [index, current] of entries.entries()) {
		const previous = entries[index + 1];
		if (!previous) continue;

		if (compareVersions(current.version, previous.version) <= 0) {
			problems.push(
				`${current.version} va antes que ${previous.version}: las versiones van de la más nueva a la más vieja, sin repetirse.`,
			);
		}

		if (current.date < previous.date) {
			problems.push(
				`${current.version} (${current.date}) tiene fecha anterior a ${previous.version} (${previous.date}).`,
			);
		}
	}

	return { entries, problems };
}

/**
 * Qué hacer al arrancar con la versión vista en este dispositivo (D058):
 *
 * - `announce`: corre una versión posterior a la vista → avisar con sus
 *   novedades (y sellarla cuando el usuario responda al aviso).
 * - `seal`: guardar la versión actual sin avisar. Primera carga en este
 *   dispositivo (o la primera desde que existe el changelog: no hay "antes"
 *   con el que comparar), un valor guardado ilegible, o una versión nueva sin
 *   entrada (no debería pasar: los tests lo impiden).
 * - `none`: nada nuevo. Incluye una pestaña con un bundle más viejo que lo ya
 *   visto: ni vuelve a avisar ni rebaja lo guardado.
 */
export type ReleaseCheck =
	| { action: "announce"; entry: ChangelogEntry }
	| { action: "seal" }
	| { action: "none" };

export function checkRelease(
	seenVersion: string | null,
	currentVersion: string,
	entries: readonly ChangelogEntry[],
): ReleaseCheck {
	if (seenVersion === null || !isValidVersion(seenVersion)) {
		return { action: "seal" };
	}

	if (compareVersions(currentVersion, seenVersion) <= 0) {
		return { action: "none" };
	}

	const entry = entries.find(
		(candidate) => candidate.version === currentVersion,
	);

	return entry ? { action: "announce", entry } : { action: "seal" };
}
