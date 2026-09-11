import {
	DEFAULT_GAME_MODE,
	DEFAULT_SCOPE,
	DEFAULT_TIMER_DURATION,
	type GameConfiguration,
	type PracticeRegion,
	type PracticeScope,
	type Region,
} from "@/types/country";
import type {
	CountriesLearningHistory,
	LastPracticeByCountry,
	RegionBestTimes,
	ReviewGrade,
	ReviewState,
	SessionRecord,
	UnlockedAchievements,
	UserLearningData,
	UserProfile,
	UserStats,
} from "@/types/progress";
import { getLocalDateString } from "@/utils/date";
import { calculateNextReview, isDue } from "@/utils/spaced-repetition";

const STORAGE_KEY = "world-flags-learning-data";

export const MAX_REGION_GAMES = 3;

/**
 * Cuántas sesiones se conservan. `pushLearningData` sube la fila entera de
 * Supabase en cada cambio, así que el historial no puede crecer sin límite:
 * 25 registros son ~6,5 KB sobre una fila que ya ronda los 33 KB. Los logros
 * que miran sesiones concretas solo necesitan las últimas; los agregados ya
 * viven en `stats`.
 */
export const MAX_SESSION_HISTORY = 25;

/** Unos dos años de días activos (~9,5 KB). `firstActiveDay` sobrevive al truncado. */
export const MAX_ACTIVE_DAYS = 730;

export const DEFAULT_PROFILE: UserProfile = {
	name: "Explorador",
	avatarStyle: "adventurer-neutral",
	avatarSeed: "explorer-1",
};

export const DEFAULT_STATS: UserStats = {
	totalSessions: 0,
	totalAnswers: 0,
	totalCorrect: 0,
	totalSkips: 0,
	perfectSessions: 0,
	totalTimePlayedMs: 0,
	activeDays: [],
	firstActiveDay: null,
};

export const DEFAULT_DATA: UserLearningData = {
	profile: DEFAULT_PROFILE,
	countryHistory: {},
	regionGameScores: {},
	regionBestTimes: {},
	lastConfiguration: null,
	lastPracticeByCountry: {},
	achievements: {},
	stats: DEFAULT_STATS,
	sessionHistory: [],
};

function migrateCountryHistory(
	history: CountriesLearningHistory | undefined,
): CountriesLearningHistory {
	if (!history) return {};

	return Object.fromEntries(
		Object.entries(history).map(([code, entry]) => [
			code,
			{ review: entry.review ?? null },
		]),
	);
}

/** Configuraciones guardadas antes del scope combinable tenían `region` en vez de `scope`. */
function migrateConfiguration(
	configuration:
		| (Partial<GameConfiguration> & { region?: PracticeRegion })
		| null
		| undefined,
): GameConfiguration | null {
	if (!configuration) return null;

	const scope: PracticeScope =
		configuration.scope ??
		(configuration.region
			? configuration.region === "world"
				? { type: "world" }
				: { type: "custom", regions: [configuration.region], countryCodes: [] }
			: DEFAULT_SCOPE);

	return {
		scope,
		order: configuration.order ?? "alphabetical",
		timerDuration: configuration.timerDuration ?? DEFAULT_TIMER_DURATION,
		timerEnabled: configuration.timerEnabled ?? false,
		difficulty: configuration.difficulty ?? "hard",
		mode: configuration.mode ?? DEFAULT_GAME_MODE,
	};
}

function sortedUniqueDays(days: Iterable<string>): string[] {
	return [...new Set(days)].sort().slice(-MAX_ACTIVE_DAYS);
}

/**
 * Siembra `activeDays` y `perfectSessions` para quien ya venía usando la app
 * antes de que existieran las estadísticas, a partir de lo único que hay:
 * la última fecha de práctica por país y la última revisión de cada país.
 *
 * Solo puede SUB-contar, nunca sobre-contar: ambas fuentes guardan una única
 * fecha por país, así que quien practicó sesenta días seguidos los mismos
 * veinte países verá unos veinte días sueltos. Son falsos negativos (una
 * racha histórica se subestima), jamás falsos positivos — y por eso es
 * seguro. Ver `context/decisions/05-logros.md`.
 */
function seedStats(
	countryHistory: CountriesLearningHistory,
	regionGameScores: UserLearningData["regionGameScores"],
	lastPracticeByCountry: LastPracticeByCountry,
): UserStats {
	const days = new Set<string>();

	for (const date of Object.values(lastPracticeByCountry)) {
		if (date) days.add(date);
	}

	for (const { review } of Object.values(countryHistory)) {
		if (!review?.lastReviewedAt) continue;

		const reviewedAt = new Date(review.lastReviewedAt);

		// `lastReviewedAt` es ISO (UTC); los días activos se cuentan con la
		// medianoche del dispositivo, igual que el candado diario. Un
		// `.slice(0, 10)` metería aquí el desfase UTC.
		if (!Number.isNaN(reviewedAt.getTime())) {
			days.add(getLocalDateString(reviewedAt));
		}
	}

	const activeDays = sortedUniqueDays(days);

	// Un 10 en `regionGameScores` ES la evidencia de una sesión sin fallos.
	const perfectSessions = Object.values(regionGameScores)
		.flat()
		.filter((score) => score === 10).length;

	return {
		...DEFAULT_STATS,
		perfectSessions,
		activeDays,
		firstActiveDay: activeDays[0] ?? null,
	};
}

function migrateStats(
	stats: Partial<UserStats> | undefined,
	countryHistory: CountriesLearningHistory,
	regionGameScores: UserLearningData["regionGameScores"],
	lastPracticeByCountry: LastPracticeByCountry,
): UserStats {
	// Ojo con el objeto vacío: las columnas nuevas de Supabase se crean con
	// `default '{}'::jsonb`, así que una fila anterior a la migración no llega
	// como `undefined` sino como `{}`. Ambos casos son "todavía sin sembrar".
	if (!stats || Object.keys(stats).length === 0) {
		return seedStats(countryHistory, regionGameScores, lastPracticeByCountry);
	}

	const activeDays = sortedUniqueDays(stats.activeDays ?? []);

	return {
		totalSessions: stats.totalSessions ?? 0,
		totalAnswers: stats.totalAnswers ?? 0,
		totalCorrect: stats.totalCorrect ?? 0,
		totalSkips: stats.totalSkips ?? 0,
		perfectSessions: stats.perfectSessions ?? 0,
		totalTimePlayedMs: stats.totalTimePlayedMs ?? 0,
		activeDays,
		firstActiveDay: stats.firstActiveDay ?? activeDays[0] ?? null,
	};
}

/**
 * Normaliza datos crudos (de localStorage o de una fila de Supabase) a un
 * `UserLearningData` completo, rellenando lo que falte y migrando esquemas
 * viejos.
 *
 * Es EXPORTADA y compartida a propósito: `fetchRemoteLearningData` mapea
 * columnas crudas y no migra nada por su cuenta, así que si no pasara por
 * aquí, un usuario con una fila anterior a esta versión entraría a Redux con
 * `stats` sin definir y cualquier lectura de `data.stats.activeDays` fallaría.
 */
export function normalizeLearningData(
	parsedData: Partial<UserLearningData>,
): UserLearningData {
	const countryHistory = migrateCountryHistory(parsedData.countryHistory);
	const regionGameScores = parsedData.regionGameScores ?? {};
	const lastPracticeByCountry = parsedData.lastPracticeByCountry ?? {};

	return {
		profile: {
			...DEFAULT_PROFILE,
			...parsedData.profile,
		},
		countryHistory,
		regionGameScores,
		regionBestTimes: parsedData.regionBestTimes ?? {},
		lastConfiguration: migrateConfiguration(parsedData.lastConfiguration),
		lastPracticeByCountry,
		achievements: parsedData.achievements ?? {},
		stats: migrateStats(
			parsedData.stats,
			countryHistory,
			regionGameScores,
			lastPracticeByCountry,
		),
		sessionHistory: (parsedData.sessionHistory ?? []).slice(
			0,
			MAX_SESSION_HISTORY,
		),
	};
}

export function createDefaultLearningData(): UserLearningData {
	return normalizeLearningData({ stats: DEFAULT_STATS });
}

export function getLearningData(): UserLearningData {
	if (typeof window === "undefined") {
		return createDefaultLearningData();
	}

	try {
		const storedData = window.localStorage.getItem(STORAGE_KEY);

		if (!storedData) {
			return createDefaultLearningData();
		}

		return normalizeLearningData(
			JSON.parse(storedData) as Partial<UserLearningData>,
		);
	} catch {
		return createDefaultLearningData();
	}
}

export function hasLearningProgress(data: UserLearningData): boolean {
	const hasCountryHistory = Object.keys(data.countryHistory).length > 0;

	const hasRegionGameScores = Object.values(data.regionGameScores).some(
		(scores) => scores.length > 0,
	);

	// Sin esto, una cuenta cuyo progreso fuera solo logros o historial se
	// consideraría "vacía" y `syncOnLogin` la pisaría con los datos locales.
	const hasAchievements = Object.keys(data.achievements).length > 0;

	return (
		hasCountryHistory ||
		hasRegionGameScores ||
		hasAchievements ||
		data.sessionHistory.length > 0
	);
}

export function saveLearningData(data: UserLearningData): void {
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearLearningData(): void {
	window.localStorage.removeItem(STORAGE_KEY);
}

export function saveUserProfile(
	currentData: UserLearningData,
	profile: UserProfile,
): UserLearningData {
	const updatedData: UserLearningData = {
		...currentData,
		profile,
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function saveLastConfiguration(
	currentData: UserLearningData,
	configuration: GameConfiguration,
): UserLearningData {
	const updatedData: UserLearningData = {
		...currentData,
		lastConfiguration: configuration,
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function updateLastConfiguration(
	currentData: UserLearningData,
	partial: Partial<GameConfiguration>,
): UserLearningData {
	const updatedData: UserLearningData = {
		...currentData,
		lastConfiguration: {
			scope: currentData.lastConfiguration?.scope ?? DEFAULT_SCOPE,
			order: currentData.lastConfiguration?.order ?? "alphabetical",
			timerDuration:
				currentData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION,
			timerEnabled: currentData.lastConfiguration?.timerEnabled ?? false,
			difficulty: currentData.lastConfiguration?.difficulty ?? "hard",
			mode: currentData.lastConfiguration?.mode ?? DEFAULT_GAME_MODE,
			...partial,
		},
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function registerCountryAttempt(
	currentData: UserLearningData,
	countryCode: string,
	isCorrect: boolean,
): UserLearningData {
	return saveReviewResult(
		currentData,
		countryCode,
		isCorrect ? "good" : "again",
	);
}

export function registerRegionGame(
	currentData: UserLearningData,
	region: Region,
	score: number,
): UserLearningData {
	const previousScores = currentData.regionGameScores[region] ?? [];

	const regionScores = [...previousScores, score].slice(-MAX_REGION_GAMES);

	const updatedData: UserLearningData = {
		...currentData,
		regionGameScores: {
			...currentData.regionGameScores,
			[region]: regionScores,
		},
	};

	saveLearningData(updatedData);

	return updatedData;
}

/** Modo competitivo ("rush"): guarda el tiempo solo si mejora la marca previa. */
export function registerRegionBestTime(
	currentData: UserLearningData,
	region: PracticeRegion,
	elapsedMs: number,
): UserLearningData {
	const previousBest = currentData.regionBestTimes[region];

	if (previousBest !== undefined && previousBest <= elapsedMs) {
		return currentData;
	}

	const updatedData: UserLearningData = {
		...currentData,
		regionBestTimes: {
			...currentData.regionBestTimes,
			[region]: elapsedMs,
		},
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function hasPracticedCountryToday(
	data: UserLearningData,
	countryCode: string,
	today: string = getLocalDateString(),
): boolean {
	return data.lastPracticeByCountry[countryCode] === today;
}

/** De una lista de países pedida, cuáles NO se han practicado todavía hoy. */
export function getUnpracticedCodesToday(
	data: UserLearningData,
	countryCodes: readonly string[],
	today: string = getLocalDateString(),
): string[] {
	return countryCodes.filter(
		(code) => data.lastPracticeByCountry[code] !== today,
	);
}

/** Unión por id. Gana el desbloqueo más antiguo: el mérito es de la primera vez. */
function mergeAchievements(
	base: UnlockedAchievements,
	incoming: UnlockedAchievements,
): UnlockedAchievements {
	const merged: UnlockedAchievements = { ...base };

	for (const [id, unlock] of Object.entries(incoming)) {
		const current = merged[id];

		if (!current) {
			merged[id] = unlock;
			continue;
		}

		merged[id] = {
			unlockedAt:
				unlock.unlockedAt < current.unlockedAt
					? unlock.unlockedAt
					: current.unlockedAt,
			// Basta con haberlo visto en un dispositivo para no volver a
			// anunciarlo en el otro.
			seenAt:
				current.seenAt === null
					? unlock.seenAt
					: unlock.seenAt === null
						? current.seenAt
						: unlock.seenAt < current.seenAt
							? unlock.seenAt
							: current.seenAt,
		};
	}

	return merged;
}

/** Los ids son uuid, así que deduplicar por id es exacto. */
function mergeSessionHistory(
	base: SessionRecord[],
	incoming: SessionRecord[],
): SessionRecord[] {
	const byId = new Map<string, SessionRecord>();

	for (const record of [...base, ...incoming]) {
		byId.set(record.id, record);
	}

	return [...byId.values()]
		.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
		.slice(0, MAX_SESSION_HISTORY);
}

function aggregateSessionCounters(history: SessionRecord[]) {
	return history.reduce(
		(totals, record) => ({
			totalSessions: totals.totalSessions + 1,
			totalAnswers: totals.totalAnswers + record.totalCountries,
			totalCorrect: totals.totalCorrect + record.correctAnswers,
			totalSkips: totals.totalSkips + record.skippedAnswers,
			perfectSessions:
				totals.perfectSessions +
				(record.totalCountries > 0 &&
				record.correctAnswers === record.totalCountries
					? 1
					: 0),
			totalTimePlayedMs: totals.totalTimePlayedMs + (record.elapsedMs ?? 0),
		}),
		{
			totalSessions: 0,
			totalAnswers: 0,
			totalCorrect: 0,
			totalSkips: 0,
			perfectSessions: 0,
			totalTimePlayedMs: 0,
		},
	);
}

/**
 * Los contadores NO se suman. `syncOnLogin` corre en cada hidratación
 * autenticada (o sea, en cada recarga) y `local` ya contiene lo que se subió
 * la vez anterior: sumar duplicaría en cada carga, sin techo.
 *
 * `max` es monótono e idempotente, pero sub-cuenta si dos dispositivos jugaron
 * sin conexión a la vez. Por eso entra un tercer candidato: lo agregado desde
 * el historial YA fusionado, que recupera justo ese caso. Cuando el historial
 * se trunca, los contadores conservan el total histórico.
 */
function mergeStats(
	base: UserStats,
	incoming: UserStats,
	mergedHistory: SessionRecord[],
): UserStats {
	const derived = aggregateSessionCounters(mergedHistory);

	const activeDays = sortedUniqueDays([
		...base.activeDays,
		...incoming.activeDays,
	]);

	const firstActiveDays = [
		base.firstActiveDay,
		incoming.firstActiveDay,
		activeDays[0],
	].filter((day): day is string => day !== null && day !== undefined);

	return {
		totalSessions: Math.max(
			base.totalSessions,
			incoming.totalSessions,
			derived.totalSessions,
		),
		totalAnswers: Math.max(
			base.totalAnswers,
			incoming.totalAnswers,
			derived.totalAnswers,
		),
		totalCorrect: Math.max(
			base.totalCorrect,
			incoming.totalCorrect,
			derived.totalCorrect,
		),
		totalSkips: Math.max(
			base.totalSkips,
			incoming.totalSkips,
			derived.totalSkips,
		),
		perfectSessions: Math.max(
			base.perfectSessions,
			incoming.perfectSessions,
			derived.perfectSessions,
		),
		totalTimePlayedMs: Math.max(
			base.totalTimePlayedMs,
			incoming.totalTimePlayedMs,
			derived.totalTimePlayedMs,
		),
		activeDays,
		firstActiveDay:
			firstActiveDays.length > 0 ? firstActiveDays.sort()[0] : null,
	};
}

/**
 * Fusiona los datos de Supabase (`remote`) con los de este dispositivo
 * (`local`) sin que uno pise al otro. Devuelve el objeto ENTERO a propósito:
 * antes se fusionaban dos campos sueltos y `syncOnLogin` los comparaba uno a
 * uno, así que añadir un campo nuevo y olvidarse de él fallaba en silencio
 * (se quedaba en local y se perdía en el siguiente dispositivo).
 *
 * Campo por campo, explícito — nada de spread ciego:
 *
 * - `profile`, `countryHistory`, `regionGameScores`, `lastConfiguration`:
 *   gana lo remoto (comportamiento previo, sin cambios).
 * - `regionBestTimes`: por continente, el menor tiempo (la mejor marca).
 * - `lastPracticeByCountry`: por país, la fecha más reciente, para que una
 *   jornada en curso local sobreviva a un login con datos remotos viejos.
 * - `achievements`: unión (nunca se pierde un logro, ni se borra un id
 *   desconocido de una versión más nueva).
 * - `stats` / `sessionHistory`: ver arriba.
 */
export function mergeLearningData(
	remote: UserLearningData,
	local: UserLearningData,
): UserLearningData {
	const lastPracticeByCountry: LastPracticeByCountry = {
		...remote.lastPracticeByCountry,
	};

	for (const [code, date] of Object.entries(local.lastPracticeByCountry)) {
		if (!date) continue;
		const current = lastPracticeByCountry[code];
		if (current === undefined || date > current) {
			lastPracticeByCountry[code] = date;
		}
	}

	const regionBestTimes: RegionBestTimes = { ...remote.regionBestTimes };

	for (const [region, timeMs] of Object.entries(local.regionBestTimes) as [
		PracticeRegion,
		number | undefined,
	][]) {
		if (timeMs === undefined) continue;
		const current = regionBestTimes[region];
		if (current === undefined || timeMs < current) {
			regionBestTimes[region] = timeMs;
		}
	}

	const sessionHistory = mergeSessionHistory(
		remote.sessionHistory,
		local.sessionHistory,
	);

	// El orden de las claves replica el de `normalizeLearningData` a propósito:
	// `syncOnLogin` compara `JSON.stringify(merged)` con el del remoto para
	// decidir si re-subir, y un orden distinto haría que siempre parecieran
	// diferentes (un push de más en cada login).
	return {
		profile: remote.profile,
		countryHistory: remote.countryHistory,
		regionGameScores: remote.regionGameScores,
		regionBestTimes,
		lastConfiguration: remote.lastConfiguration,
		lastPracticeByCountry,
		achievements: mergeAchievements(remote.achievements, local.achievements),
		stats: mergeStats(remote.stats, local.stats, sessionHistory),
		sessionHistory,
	};
}

/** Marca hoy como día activo. Sin cambio si ya estaba: así no dispara una escritura de más. */
export function touchActiveDay(
	currentData: UserLearningData,
	today: string = getLocalDateString(),
): UserLearningData {
	if (currentData.stats.activeDays.includes(today)) {
		return currentData;
	}

	const activeDays = sortedUniqueDays([...currentData.stats.activeDays, today]);

	const updatedData: UserLearningData = {
		...currentData,
		stats: {
			...currentData.stats,
			activeDays,
			firstActiveDay: currentData.stats.firstActiveDay ?? activeDays[0] ?? null,
		},
	};

	saveLearningData(updatedData);

	return updatedData;
}

function createSessionId(): string {
	// `crypto.randomUUID` exige contexto seguro (https o localhost); en una
	// prueba por IP de LAN no existe.
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createSessionRecord(
	record: Omit<SessionRecord, "id">,
): SessionRecord {
	return { id: createSessionId(), ...record };
}

/**
 * Registra una sesión terminada: acumula los contadores PRIMERO y trunca el
 * historial DESPUÉS (al revés, lo que se sale del tope no llegaría a contarse).
 */
export function registerSessionOutcome(
	currentData: UserLearningData,
	record: SessionRecord,
): UserLearningData {
	const { stats } = currentData;

	const isPerfect =
		record.totalCountries > 0 &&
		record.correctAnswers === record.totalCountries;

	const activeDays = sortedUniqueDays([
		...stats.activeDays,
		getLocalDateString(new Date(record.finishedAt)),
	]);

	const updatedData: UserLearningData = {
		...currentData,
		stats: {
			...stats,
			totalSessions: stats.totalSessions + 1,
			totalAnswers: stats.totalAnswers + record.totalCountries,
			totalCorrect: stats.totalCorrect + record.correctAnswers,
			totalSkips: stats.totalSkips + record.skippedAnswers,
			perfectSessions: stats.perfectSessions + (isPerfect ? 1 : 0),
			totalTimePlayedMs: stats.totalTimePlayedMs + (record.elapsedMs ?? 0),
			activeDays,
			firstActiveDay: stats.firstActiveDay ?? activeDays[0] ?? null,
		},
		sessionHistory: [record, ...currentData.sessionHistory].slice(
			0,
			MAX_SESSION_HISTORY,
		),
	};

	saveLearningData(updatedData);

	return updatedData;
}

/**
 * Sella logros recién desbloqueados. Un logro ya sellado NUNCA se toca: ver la
 * invariante de monotonía en `src/utils/achievements.ts`.
 */
export function sealAchievements(
	currentData: UserLearningData,
	achievementIds: readonly string[],
	unlockedAt: string = new Date().toISOString(),
): UserLearningData {
	const newIds = achievementIds.filter((id) => !currentData.achievements[id]);

	if (newIds.length === 0) {
		return currentData;
	}

	const achievements: UnlockedAchievements = { ...currentData.achievements };

	for (const id of newIds) {
		achievements[id] = { unlockedAt, seenAt: null };
	}

	const updatedData: UserLearningData = { ...currentData, achievements };

	saveLearningData(updatedData);

	return updatedData;
}

/** Marca todos los logros como vistos (apaga el contador del icono). */
export function markAchievementsSeen(
	currentData: UserLearningData,
	seenAt: string = new Date().toISOString(),
): UserLearningData {
	const unseenIds = Object.keys(currentData.achievements).filter(
		(id) => currentData.achievements[id]?.seenAt === null,
	);

	if (unseenIds.length === 0) {
		return currentData;
	}

	const achievements: UnlockedAchievements = { ...currentData.achievements };

	for (const id of unseenIds) {
		const unlock = achievements[id];
		if (unlock) achievements[id] = { ...unlock, seenAt };
	}

	const updatedData: UserLearningData = { ...currentData, achievements };

	saveLearningData(updatedData);

	return updatedData;
}

function previousDay(day: string): string {
	const date = new Date(`${day}T00:00:00`);
	date.setDate(date.getDate() - 1);

	return getLocalDateString(date);
}

/**
 * Racha en curso: días consecutivos hacia atrás desde hoy. Si el último día
 * activo fue ayer la racha sigue viva (todavía se está a tiempo de practicar
 * hoy); si fue antes, es 0.
 *
 * Se deriva de `activeDays` en vez de guardar un contador porque un contador
 * no es fusionable: "3" en el móvil y "3" en el escritorio pueden ser los
 * mismos tres días o seis distintos. Un conjunto de fechas sí se une exacto.
 */
export function getCurrentStreak(
	activeDays: readonly string[],
	today: string = getLocalDateString(),
): number {
	if (activeDays.length === 0) return 0;

	const days = new Set(activeDays);

	let cursor = days.has(today) ? today : previousDay(today);

	if (!days.has(cursor)) return 0;

	let streak = 0;

	while (days.has(cursor)) {
		streak += 1;
		cursor = previousDay(cursor);
	}

	return streak;
}

export function getLongestStreak(activeDays: readonly string[]): number {
	const days = [...new Set(activeDays)].sort();

	let longest = 0;
	let current = 0;

	for (const [index, day] of days.entries()) {
		const isConsecutive = index > 0 && previousDay(day) === days[index - 1];

		current = isConsecutive ? current + 1 : 1;
		longest = Math.max(longest, current);
	}

	return longest;
}

export function registerCountryPracticed(
	currentData: UserLearningData,
	countryCode: string,
): UserLearningData {
	const updatedData: UserLearningData = {
		...currentData,
		lastPracticeByCountry: {
			...currentData.lastPracticeByCountry,
			[countryCode]: getLocalDateString(),
		},
	};

	saveLearningData(updatedData);
	return updatedData;
}

export function isCountryLearned(review: ReviewState | null): boolean {
	return review !== null && review.repetitions > 0;
}

export function countLearnedCountries(
	history: CountriesLearningHistory,
): number {
	return Object.values(history).filter(({ review }) => isCountryLearned(review))
		.length;
}

export function calculateLearningProgress(
	history: CountriesLearningHistory,
	totalCountries: number,
): number {
	if (totalCountries <= 0) {
		return 0;
	}

	const learnedCountries = countLearnedCountries(history);

	return Math.round((learnedCountries / totalCountries) * 100);
}

export function calculateRegionAverage(
	scores: number[] | undefined,
): number | null {
	if (!scores?.length) {
		return null;
	}

	const total = scores.reduce((accumulator, score) => accumulator + score, 0);

	return Math.round((total / scores.length) * 10) / 10;
}

export function formatScore(score: number): string {
	return Number.isInteger(score) ? score.toFixed(0) : score.toFixed(1);
}

/**
 * Formatea milisegundos como "m:ss.cc" (minutos:segundos.centésimas), ej.
 * 85590 -> "1:25.59". Si dura menos de un minuto, omite los minutos en vez
 * de mostrar "0:" (ej. 32250 -> "32.25", no "0:32.25").
 */
export function formatElapsedTime(elapsedMs: number): string {
	const totalHundredths = Math.round(elapsedMs / 10);
	const minutes = Math.floor(totalHundredths / 6000);
	const seconds = Math.floor((totalHundredths % 6000) / 100);
	const hundredths = totalHundredths % 100;
	const hundredthsLabel = String(hundredths).padStart(2, "0");

	if (minutes === 0) {
		return `${seconds}.${hundredthsLabel}`;
	}

	return `${minutes}:${String(seconds).padStart(2, "0")}.${hundredthsLabel}`;
}

export function saveReviewResult(
	currentData: UserLearningData,
	countryCode: string,
	grade: ReviewGrade,
): UserLearningData {
	const previousReview =
		currentData.countryHistory[countryCode]?.review ?? null;

	const updatedData: UserLearningData = {
		...currentData,
		countryHistory: {
			...currentData.countryHistory,
			[countryCode]: { review: calculateNextReview(previousReview, grade) },
		},
	};

	saveLearningData(updatedData);
	return updatedData;
}

export function getDueCountries(history: CountriesLearningHistory): string[] {
	return Object.keys(history).filter((code) =>
		isDue(history[code]?.review ?? null),
	);
}
