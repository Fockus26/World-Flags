/**
 * Ranking de demostración, **solo en desarrollo** (D117). Sirve para ver cómo
 * luce el ranking con mucha gente sin escribir nada en `leaderboard_entries`,
 * que es la tabla de producción y es pública.
 *
 * Se activa con `?demo-ranking` en la URL, y solo si `import.meta.env.DEV`:
 * `LeaderboardModal` importa este archivo con un `import()` dentro de esa
 * condición, así que en el build de producción la rama entera desaparece y
 * este código no llega a `dist/`.
 *
 * Opciones, separadas por comas en el valor del parámetro:
 * - `lento`: la respuesta tarda `SLOW_DELAY_MS` (para ver el skeleton y la
 *   altura animada). Sin ella tarda `FAST_DELAY_MS`, como una red buena.
 * - `top`: tu fila entra en el top (puesto `OWN_RANK_IN_TOP`). Sin ella queda
 *   fuera (puesto `OWN_RANK_OUTSIDE_TOP`), bajo el separador.
 * - `sin-mi`: sin tu fila (como un invitado o alguien sin tiempo).
 * - `podio`: tu fila en el puesto `OWN_RANK_PODIUM`, con su medalla (D148).
 * - `lejos`: tu fila queda en el puesto `OWN_RANK_FAR` (tres cifras, para ver
 *   el ancho de la columna del puesto, D150). Sin número, sube el tamaño a
 *   `FAR_DEMO_SIZE`.
 * - un número (`0`…`DEMO_MAX_SIZE`): cuántas personas falsas hay, sin
 *   contarte. Por defecto `DEMO_SIZE`. `0,sin-mi` deja el ranking vacío;
 *   `1,sin-mi`, una sola fila.
 *
 * Ej.: `?demo-ranking`, `?demo-ranking=lento`, `?demo-ranking=1,sin-mi,lento`,
 * `?demo-ranking=podio`, `?demo-ranking=lejos`.
 *
 * Los datos salen de un generador con semilla fija por scope: cada juego
 * tiene su ranking, y es el mismo en cada apertura y en cada recarga.
 */

import { countries } from "@/data/countries";
import {
	GAME_TYPES,
	getLeaderboardScope,
	LEADERBOARD_SCOPES,
	REGIONS,
} from "@/types/country";
import { AVATAR_STYLES, type AvatarStyle } from "@/types/progress";
import type { LeaderboardEntry } from "@/utils/cloud-storage";
import { REGION_COUNTRY_COUNTS } from "@/utils/region-stats";

/** Cuántas personas falsas hay por defecto (P8). */
const DEMO_SIZE = 30;
/** Tope del número de personas (D150): hasta tres cifras de puesto. */
const DEMO_MAX_SIZE = 200;
/** Tamaño por defecto con `lejos`: cabe tu puesto de tres cifras. */
const FAR_DEMO_SIZE = 150;
const FAST_DELAY_MS = 250;
const SLOW_DELAY_MS = 3000;
const OWN_RANK_IN_TOP = 4;
const OWN_RANK_OUTSIDE_TOP = 27;
const OWN_RANK_FAR = 123;
const OWN_RANK_PODIUM = 2;

/** Nombres variados como los que se ponen de verdad: nombre, nombre + inicial, apodos. */
const FIRST_NAMES = [
	"Lucía",
	"Mateo",
	"Valentina",
	"Santiago",
	"Camila",
	"Diego",
	"Sofía",
	"Joaquín",
	"Martina",
	"Tomás",
	"Isabella",
	"Nicolás",
	"Ana",
	"Julián",
	"Paula",
	"Andrés",
	"Mariana",
	"Gabriel",
	"Elena",
	"Hugo",
	"Carla",
	"Iker",
	"Noa",
	"Bruno",
	"Renata",
	"Emilio",
	"Aitana",
	"Leo",
	"Jimena",
	"Samuel",
];

const NICKNAMES = [
	"geo_nerd",
	"banderitas",
	"MapaMundi",
	"el_viajero",
	"Atlas99",
	"capitalista",
	"trotamundos",
	"vexilo_fan",
	"PangeaKid",
	"nortesur",
];

const SURNAME_INITIALS = "ABCDEFGHIJLMNOPRSTV";

/**
 * Mejores tiempos verosímiles por juego (ms), del primero al último: Países
 * se escribe de memoria (sin castigo) y Banderas/Capitales llevan el castigo
 * de la regla 2 (D075), así que el mundo entero tarda bastantes minutos.
 */
const TIME_RANGES: Record<string, { minMs: number; maxMs: number }> = {
	"countries:world": { minMs: 9 * 60_000, maxMs: 45 * 60_000 },
	"flags:world@2": { minMs: 11 * 60_000, maxMs: 55 * 60_000 },
	"capitals:world@2": { minMs: 14 * 60_000, maxMs: 70 * 60_000 },
};
const DEFAULT_TIME_RANGE = { minMs: 10 * 60_000, maxMs: 50 * 60_000 };

/**
 * Rango de tiempos de un scope. Los de continente (D137) salen del de "Todo
 * el mundo" de su juego, en proporción a sus países: Centroamérica no tarda
 * lo mismo que África.
 */
function getTimeRange(scope: string): { minMs: number; maxMs: number } {
	const known = TIME_RANGES[scope];
	if (known) return known;

	const region = REGIONS.find((candidate) =>
		GAME_TYPES.some(
			(gameType) => getLeaderboardScope(gameType, candidate) === scope,
		),
	);
	const gameType = GAME_TYPES.find((candidate) =>
		scope.startsWith(`${candidate}:`),
	);
	const worldRange = gameType && TIME_RANGES[LEADERBOARD_SCOPES[gameType]];

	if (!region || !worldRange) return DEFAULT_TIME_RANGE;

	const ratio = REGION_COUNTRY_COUNTS[region] / countries.length;

	return {
		minMs: Math.round(worldRange.minMs * ratio),
		maxMs: Math.round(worldRange.maxMs * ratio),
	};
}

/** Generador pseudoaleatorio pequeño con semilla (mulberry32). */
function createRandom(seed: number): () => number {
	let state = seed >>> 0;

	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hashString(value: string): number {
	let hash = 2166136261;

	for (const char of value) {
		hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
	}

	return hash >>> 0;
}

function pick<T>(items: readonly T[], random: () => number): T {
	return items[Math.floor(random() * items.length)];
}

function createName(index: number, random: () => number): string {
	const roll = random();

	if (roll < 0.2) return pick(NICKNAMES, random);

	const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
	if (roll < 0.6) return `${firstName} ${pick([...SURNAME_INITIALS], random)}.`;

	return firstName;
}

function createAvatar(
	random: () => number,
): { style: AvatarStyle; seed: string } | null {
	// Alguna fila sin avatar: así se ven también las iniciales (D078).
	if (random() < 0.12) return null;

	return {
		style: pick(AVATAR_STYLES, random),
		seed: `demo-${Math.floor(random() * 1_000_000)}`,
	};
}

interface DemoOptions {
	size: number;
	delayMs: number;
	/** Puesto de tu fila, o `null` sin ella. */
	ownRank: number | null;
}

function parseOptions(param: string): DemoOptions {
	const tokens = param
		.split(",")
		.map((token) => token.trim().toLowerCase())
		.filter(Boolean);
	const sizeToken = tokens.find((token) => /^\d+$/.test(token));
	const isFar = tokens.includes("lejos");

	return {
		size:
			sizeToken === undefined
				? isFar
					? FAR_DEMO_SIZE
					: DEMO_SIZE
				: Math.min(Number(sizeToken), DEMO_MAX_SIZE),
		delayMs: tokens.includes("lento") ? SLOW_DELAY_MS : FAST_DELAY_MS,
		ownRank: tokens.includes("sin-mi")
			? null
			: tokens.includes("podio")
				? OWN_RANK_PODIUM
				: tokens.includes("top")
					? OWN_RANK_IN_TOP
					: isFar
						? OWN_RANK_FAR
						: OWN_RANK_OUTSIDE_TOP,
	};
}

/**
 * Sustituto de `fetchLeaderboard` en la demo: misma forma de respuesta
 * (ordenada por tiempo), con `ownId` como una fila más para ver la tuya
 * (dentro o fuera del top). Con menos personas que su puesto, va la última.
 */
export async function fetchDemoLeaderboard(
	scope: string,
	param: string,
	ownId: string,
): Promise<LeaderboardEntry[]> {
	const { size, delayMs, ownRank } = parseOptions(param);
	const random = createRandom(hashString(scope));
	const { minMs, maxMs } = getTimeRange(scope);

	// Tiempos ordenados con más gente cerca de la cabeza que de la cola.
	// Con 30 o menos se generan 30, como siempre: la demo de siempre no cambia.
	const times = Array.from(
		{ length: Math.max(DEMO_SIZE, size) },
		() => minMs + (maxMs - minMs) * random() ** 1.6,
	)
		.map(Math.round)
		.sort((a, b) => a - b);

	const others: LeaderboardEntry[] = times.map((bestTimeMs, index) => ({
		userId: `demo-ranking-${index + 1}`,
		displayName: createName(index, random),
		bestTimeMs,
		avatar: createAvatar(random),
	}));

	const entries = others.slice(0, size);

	if (ownRank !== null) {
		const ownIndex = Math.min(ownRank, entries.length + 1) - 1;
		// Tu tiempo queda entre el de delante y el de detrás: el orden sigue siendo por tiempo.
		const before = entries[ownIndex - 1]?.bestTimeMs ?? minMs;
		const after = entries[ownIndex]?.bestTimeMs ?? before + 30_000;

		entries.splice(ownIndex, 0, {
			userId: ownId,
			displayName: "Tu nombre",
			bestTimeMs: Math.round((before + after) / 2),
			avatar: { style: AVATAR_STYLES[0], seed: "explorer-1" },
		});
	}

	await new Promise((resolve) => setTimeout(resolve, delayMs));
	return entries;
}
