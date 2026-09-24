import {
	DEFAULT_GAME_MODE,
	DEFAULT_GAME_TYPE,
	DEFAULT_SCOPE,
	DEFAULT_TIMER_DURATION,
	GAME_TYPES,
	type GameConfiguration,
	type GameType,
	type PracticeRegion,
	type PracticeScope,
	REGIONS,
	type Region,
} from "@/types/country";
import type {
	CountriesLearningHistory,
	DailyReminderPreference,
	FieldUpdatedAt,
	GameProgress,
	LastPracticeByCountry,
	RegionBestTimes,
	RegionGameScores,
	ReviewGrade,
	ReviewState,
	SessionRecord,
	UnlockedAchievements,
	UserLearningData,
	UserProfile,
	UserStats,
} from "@/types/progress";
import { isCatalogCountryCode } from "@/utils/country-catalog";
import { getLocalDateString } from "@/utils/date";
import { REGION_COUNTRY_COUNTS } from "@/utils/region-stats";
import {
	calculateNextReview,
	isDue,
	pickMoreRecentReview,
} from "@/utils/spaced-repetition";

const STORAGE_KEY = "world-flags-learning-data";

export const MAX_REGION_GAMES = 3;

/**
 * Cuántas sesiones se conservan. Cada subida a Supabase lleva la fila entera
 * (agrupadas desde D051, pero enteras), así que el historial no puede crecer
 * sin límite: 25 registros son ~6,5 KB sobre una fila que ya ronda los 33 KB.
 * Los logros que miran sesiones concretas solo necesitan las últimas; los
 * agregados ya viven en `stats`.
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

export const DEFAULT_GAME_PROGRESS: GameProgress = {
	countryHistory: {},
	regionGameScores: {},
	regionBestTimes: {},
	lastPracticeByCountry: {},
	regionGameScoresUpdatedAt: {},
};

export const DEFAULT_FIELD_UPDATED_AT: FieldUpdatedAt = {
	profile: null,
	lastConfiguration: null,
};

export const DEFAULT_DAILY_REMINDER: DailyReminderPreference = {
	answered: false,
	optedIn: false,
	answeredAt: null,
};

/** Los juegos que no son Banderas: los que guardan su progreso en un sub-objeto propio. */
export type SubGameType = Exclude<GameType, "flags">;

/** Las claves de `UserLearningData` que guardan el progreso de un juego entero. */
export type SubGameKey = {
	[K in keyof UserLearningData]: UserLearningData[K] extends GameProgress
		? K
		: never;
}[keyof UserLearningData];

/**
 * Registro de juegos (D061): el único sitio que sabe dónde vive el progreso
 * de cada uno. Banderas, el juego original, sigue en el primer nivel de
 * `UserLearningData` (D028: renombrarlo rompería las filas ya guardadas y a
 * los clientes viejos que el SW mantiene en caché); cada juego posterior
 * tiene su sub-objeto y su columna en Supabase. Añadir un juego es añadir
 * aquí su clave: `normalizeLearningData`, `mergeLearningData`,
 * `hasLearningProgress` y las vistas de juego lo recorren solos, y el
 * `Record` no deja olvidarlo.
 */
export const SUB_GAME_KEYS: Record<SubGameType, SubGameKey> = {
	countries: "countriesGame",
	capitals: "capitalsGame",
};

/** Los juegos con sub-objeto, en el orden de `GAME_TYPES`: fija el orden de sus claves en `UserLearningData`. */
export const SUB_GAME_TYPES: readonly SubGameType[] = GAME_TYPES.filter(
	(gameType): gameType is SubGameType => gameType !== "flags",
);

export const DEFAULT_DATA: UserLearningData = {
	profile: DEFAULT_PROFILE,
	countryHistory: {},
	regionGameScores: {},
	regionBestTimes: {},
	lastConfiguration: null,
	lastPracticeByCountry: {},
	countriesGame: DEFAULT_GAME_PROGRESS,
	capitalsGame: DEFAULT_GAME_PROGRESS,
	achievements: {},
	stats: DEFAULT_STATS,
	sessionHistory: [],
	dailyReminder: DEFAULT_DAILY_REMINDER,
	fieldUpdatedAt: DEFAULT_FIELD_UPDATED_AT,
	regionGameScoresUpdatedAt: {},
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
		// Configuración guardada antes de que existiera el modo Países no trae
		// `gameType`: se migra a "flags" (D030), no al default de un usuario
		// nuevo ("countries") — quien ya jugaba no debe verse cambiado de golpe
		// al juego que no eligió. Un juego que este cliente no conoce (de una
		// versión más nueva, llegado por la nube) se conserva tal cual: pisarlo
		// aquí lo subiría a la nube. Se resuelve al leerlo, con
		// `resolveGameType` (D062).
		gameType: configuration.gameType ?? "flags",
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
 * Normaliza el progreso de un juego con sub-objeto propio (Banderas vive en
 * el primer nivel de `UserLearningData`, ver `migrateCountryHistory`/etc.
 * arriba; esto es para los demás, ver `SUB_GAME_KEYS`). Igual que con
 * `stats`, una columna de Supabase creada con `default '{}'::jsonb` llega
 * como `{}` en vez de `undefined` para una fila anterior a esta versión —
 * ambos casos son "todavía sin progreso".
 */
function migrateGameProgress(
	progress: Partial<GameProgress> | undefined,
): GameProgress {
	return {
		countryHistory: migrateCountryHistory(progress?.countryHistory),
		regionGameScores: progress?.regionGameScores ?? {},
		regionBestTimes: progress?.regionBestTimes ?? {},
		lastPracticeByCountry: progress?.lastPracticeByCountry ?? {},
		regionGameScoresUpdatedAt: progress?.regionGameScoresUpdatedAt ?? {},
	};
}

/**
 * Construye los sub-objetos de todos los juegos que no son Banderas, en el
 * orden de `SUB_GAME_TYPES`. `normalizeLearningData` y `mergeLearningData`
 * los insertan en la misma posición con este mismo orden: ver el comentario
 * sobre `JSON.stringify` en `normalizeLearningData`.
 */
function buildSubGames(
	build: (key: SubGameKey) => GameProgress,
): Pick<UserLearningData, SubGameKey> {
	return Object.fromEntries(
		SUB_GAME_TYPES.map((gameType) => {
			const key = SUB_GAME_KEYS[gameType];
			return [key, build(key)];
		}),
	) as Pick<UserLearningData, SubGameKey>;
}

/** Datos anteriores a D055: sin fechas (`null`), la fusión usa la base. */
function migrateFieldUpdatedAt(
	fieldUpdatedAt: Partial<FieldUpdatedAt> | undefined,
): FieldUpdatedAt {
	return {
		profile: fieldUpdatedAt?.profile ?? null,
		lastConfiguration: fieldUpdatedAt?.lastConfiguration ?? null,
	};
}

/** Columna de Supabase creada con `default '{}'::jsonb`: una fila anterior a esta versión llega como `{}`, no `undefined`. Ambos casos son "todavía sin responder". */
function migrateDailyReminder(
	reminder: Partial<DailyReminderPreference> | undefined,
): DailyReminderPreference {
	if (!reminder || Object.keys(reminder).length === 0) {
		return DEFAULT_DAILY_REMINDER;
	}

	return {
		answered: reminder.answered ?? false,
		optedIn: reminder.optedIn ?? false,
		answeredAt: reminder.answeredAt ?? null,
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
		// Misma posición que en `mergeLearningData`: `syncLearningData` compara
		// `JSON.stringify` de objetos completos para decidir si re-subir, y un
		// orden de claves distinto haría que siempre parecieran diferentes.
		...buildSubGames((key) => migrateGameProgress(parsedData[key])),
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
		dailyReminder: migrateDailyReminder(parsedData.dailyReminder),
		fieldUpdatedAt: migrateFieldUpdatedAt(parsedData.fieldUpdatedAt),
		regionGameScoresUpdatedAt: parsedData.regionGameScoresUpdatedAt ?? {},
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

function hasGameProgress(progress: GameProgress): boolean {
	const hasCountryHistory = Object.keys(progress.countryHistory).length > 0;

	const hasRegionGameScores = Object.values(progress.regionGameScores).some(
		(scores) => scores.length > 0,
	);

	return hasCountryHistory || hasRegionGameScores;
}

export function hasLearningProgress(data: UserLearningData): boolean {
	// Sin esto, una cuenta cuyo progreso fuera solo logros o historial se
	// consideraría "vacía" y `syncLearningData` la pisaría con los datos locales.
	const hasAchievements = Object.keys(data.achievements).length > 0;

	// Todos los juegos, desde el registro: una cuenta que solo jugó uno de
	// ellos también tiene progreso, y `planSync` no debe dejar que el
	// invitado la pise (D056).
	return (
		GAME_TYPES.some((gameType) =>
			hasGameProgress(getGameProgress(data, gameType)),
		) ||
		hasAchievements ||
		data.sessionHistory.length > 0
	);
}

export function saveLearningData(data: UserLearningData): void {
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Logout real (D009): se van los datos de la cuenta y, con ellos, su base de sincronización. */
export function clearLearningData(): void {
	window.localStorage.removeItem(STORAGE_KEY);
	clearSyncBase();
}

/**
 * El progreso de `gameType`, esté donde esté guardado (ver `SUB_GAME_KEYS`).
 * Para Banderas lo arma con los campos de primer nivel, en el mismo orden
 * de claves que `migrateGameProgress`.
 */
export function getGameProgress(
	data: UserLearningData,
	gameType: GameType,
): GameProgress {
	if (gameType === "flags") {
		return {
			countryHistory: data.countryHistory,
			regionGameScores: data.regionGameScores,
			regionBestTimes: data.regionBestTimes,
			lastPracticeByCountry: data.lastPracticeByCountry,
			regionGameScoresUpdatedAt: data.regionGameScoresUpdatedAt,
		};
	}

	return data[SUB_GAME_KEYS[gameType]];
}

/**
 * `data` con el progreso de `gameType` sustituido por `progress`, sin
 * persistir. Las claves que ya existen conservan su posición en el objeto
 * (el spread no las reordena), así que `JSON.stringify` no cambia de forma.
 */
function setGameProgress(
	data: UserLearningData,
	gameType: GameType,
	progress: GameProgress,
): UserLearningData {
	if (gameType === "flags") {
		return {
			...data,
			countryHistory: progress.countryHistory,
			regionGameScores: progress.regionGameScores,
			regionBestTimes: progress.regionBestTimes,
			lastPracticeByCountry: progress.lastPracticeByCountry,
			regionGameScoresUpdatedAt: progress.regionGameScoresUpdatedAt,
		};
	}

	return { ...data, [SUB_GAME_KEYS[gameType]]: progress };
}

/**
 * Proyecta el progreso de `gameType` sobre los campos de primer nivel de
 * `UserLearningData` — el sitio donde viven todas las funciones puras de
 * este archivo (`saveReviewResult`, `registerRegionGame`,
 * `getUnpracticedCodesToday`, `getDueCountries`…). Así una acción de
 * `useGame` puede llamar a esas funciones sin que sepan que hay más de un
 * juego: para "flags" es la identidad (ya viven ahí); para los demás copia
 * su sub-objeto al primer nivel. Ver D029.
 */
export function toGameView(
	data: UserLearningData,
	gameType: GameType,
): UserLearningData {
	if (gameType === "flags") return data;

	return setGameProgress(data, "flags", getGameProgress(data, gameType));
}

/**
 * Inversa de `toGameView`: toma el resultado de aplicar una función pura
 * sobre la vista de `gameType` y lo devuelve con el progreso en el sitio
 * correcto de `UserLearningData`. Para "flags" es la identidad. Para los
 * demás restaura los campos de primer nivel de Banderas desde `original`
 * (la vista los había pisado con los de ese juego) y mueve lo que cambió de
 * vuelta a su sub-objeto, conservando de `view` todo lo compartido (stats,
 * sessionHistory, achievements, lastConfiguration, profile) que la función
 * pura haya tocado.
 *
 * Vuelve a persistir con `saveLearningData` cuando `gameType` no es "flags":
 * la función pura que se llamó sobre la vista (p. ej. `saveReviewResult`) ya
 * persistió por su cuenta, pero lo que escribió a `localStorage` es la VISTA
 * — de primer nivel trae el progreso de ese juego, y su sub-objeto todavía
 * está desactualizado. Sin este segundo `saveLearningData`, una recarga
 * antes del siguiente cambio leería ese estado a medio corregir.
 */
export function fromGameView(
	original: UserLearningData,
	view: UserLearningData,
	gameType: GameType,
): UserLearningData {
	if (gameType === "flags") return view;

	const corrected = setGameProgress(
		setGameProgress(view, "flags", getGameProgress(original, "flags")),
		gameType,
		getGameProgress(view, "flags"),
	);

	saveLearningData(corrected);

	return corrected;
}

const DEVICE_ID_STORAGE_KEY = "world-flags-device-id";

/**
 * Identificador de ESTE navegador/instalación, no de la cuenta. A propósito
 * vive en su propia clave de `localStorage`, fuera de `UserLearningData`: esa
 * estructura se sincroniza entera por cuenta (ver `mergeLearningData`), y un
 * id de dispositivo mezclado ahí terminaría copiado de un dispositivo a otro
 * en el primer login, rompiendo la fila de `push_subscriptions` (que usa este
 * id como clave por dispositivo).
 */
export function getOrCreateDeviceId(): string {
	if (typeof window === "undefined") {
		return "";
	}

	try {
		const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
		if (existing) return existing;

		const created =
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2)}`;

		window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
		return created;
	} catch {
		return "";
	}
}

const SEEN_RELEASE_STORAGE_KEY = "world-flags-seen-release";

/**
 * Última versión de la app cuyas novedades ya se ofrecieron en ESTE
 * dispositivo (D058). Por dispositivo, como el id de arriba, y no en
 * `UserLearningData`: lo que se anuncia es el bundle que acaba de llegar a
 * este navegador, que no es el mismo momento en cada dispositivo (el service
 * worker de cada uno puede seguir sirviendo uno anterior). Sincronizado, verlo
 * en el móvil lo daría por visto en un portátil que todavía no se actualizó;
 * además costaría una columna nueva y reglas de fusión, y el invitado no lo
 * tendría. `null` si nunca se guardó o no se puede leer.
 */
export function getSeenReleaseVersion(): string | null {
	if (typeof window === "undefined") return null;

	try {
		return window.localStorage.getItem(SEEN_RELEASE_STORAGE_KEY);
	} catch {
		return null;
	}
}

export function saveSeenReleaseVersion(version: string): void {
	try {
		window.localStorage.setItem(SEEN_RELEASE_STORAGE_KEY, version);
	} catch {
		// Sin acceso a localStorage el aviso volverá a salir en la próxima
		// carga: molesto, pero no pierde nada.
	}
}

const TUTORIAL_SEEN_STORAGE_KEY = "world-flags-tutorial-seen";

/**
 * ¿Ya se ofreció la partida guiada en ESTE dispositivo (D071)?
 *
 * Por dispositivo, como la versión vista de arriba, y **no** en
 * `UserLearningData`: esa estructura se sincroniza entera por cuenta, así que
 * meterlo ahí costaría una columna nueva en Supabase (con su SQL corrido a
 * mano antes de desplegar, que es lo que bloqueó los dos últimos despliegues),
 * sus reglas de fusión, y el invitado —que es justo quien más va a ver el
 * tutorial— no tiene cuenta que sincronizar.
 *
 * Lo que de verdad evita repetirlo no es esta marca, sino la puerta de
 * `shouldOfferTutorial`: con progreso ya guardado no se ofrece, venga de donde
 * venga. Así que en el segundo dispositivo de una cuenta que ya jugó tampoco
 * se ofrece, aunque la marca no haya viajado. El caso que queda —misma
 * persona, cero progreso, otro dispositivo— vuelve a verlo, y es inofensivo:
 * todavía no ha jugado. Y al contrario que si viviera en el blob, sobrevive
 * intacta a que un invitado entre en una cuenta (D056 puede descartar su
 * progreso entero, y con él la marca).
 *
 * `false` si nunca se guardó o no se puede leer.
 */
export function getTutorialSeen(): boolean {
	if (typeof window === "undefined") return false;

	try {
		return window.localStorage.getItem(TUTORIAL_SEEN_STORAGE_KEY) === "true";
	} catch {
		return false;
	}
}

/** Se marca al cerrar el recorrido, tanto si se completó como si se saltó. */
export function saveTutorialSeen(): void {
	try {
		window.localStorage.setItem(TUTORIAL_SEEN_STORAGE_KEY, "true");
	} catch {
		// Sin acceso a localStorage el tutorial volverá a ofrecerse en la
		// próxima carga: molesto, pero no pierde nada.
	}
}

const SOUND_ENABLED_STORAGE_KEY = "world-flags-sound-enabled";

/**
 * ¿Suenan los efectos de acierto, fallo y logro en ESTE dispositivo (D081)?
 *
 * Por dispositivo, como la marca del tutorial (D071), y no en
 * `UserLearningData`: es una preferencia del aparato (el móvil en el metro
 * callado, el portátil en casa con sonido), costaría una columna nueva en
 * Supabase con su SQL a mano, y el invitado también tiene que poder apagarlo.
 *
 * Activado por defecto: `true` si nunca se guardó, si lo guardado no es
 * `"false"` o si no se puede leer. Solo `"false"` lo apaga.
 */
export function getSoundEnabled(): boolean {
	if (typeof window === "undefined") return true;

	try {
		return window.localStorage.getItem(SOUND_ENABLED_STORAGE_KEY) !== "false";
	} catch {
		return true;
	}
}

/**
 * Escribirla solo se hace desde el interruptor de la pestaña Juego
 * (`useSoundPreference`). La partida guiada lee la preferencia (vía
 * `utils/sound.ts`) pero no puede escribirla: la vigila
 * `tests/unit/tutorial-sandbox.test.ts`.
 */
export function saveSoundEnabled(enabled: boolean): void {
	try {
		window.localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, String(enabled));
	} catch {
		// Sin acceso a localStorage no hay dónde recordarlo y sigue sonando:
		// en ese navegador tampoco se guarda el progreso, así que es el menor
		// de sus problemas.
	}
}

export function saveDailyReminderAnswer(
	currentData: UserLearningData,
	optedIn: boolean,
	answeredAt: string = new Date().toISOString(),
): UserLearningData {
	const updatedData: UserLearningData = {
		...currentData,
		dailyReminder: { answered: true, optedIn, answeredAt },
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function saveUserProfile(
	currentData: UserLearningData,
	profile: UserProfile,
	updatedAt: string = new Date().toISOString(),
): UserLearningData {
	const updatedData: UserLearningData = {
		...currentData,
		profile,
		fieldUpdatedAt: { ...currentData.fieldUpdatedAt, profile: updatedAt },
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function saveLastConfiguration(
	currentData: UserLearningData,
	configuration: GameConfiguration,
	updatedAt: string = new Date().toISOString(),
): UserLearningData {
	const updatedData: UserLearningData = {
		...currentData,
		lastConfiguration: configuration,
		fieldUpdatedAt: {
			...currentData.fieldUpdatedAt,
			lastConfiguration: updatedAt,
		},
	};

	saveLearningData(updatedData);

	return updatedData;
}

export function updateLastConfiguration(
	currentData: UserLearningData,
	partial: Partial<GameConfiguration>,
	updatedAt: string = new Date().toISOString(),
): UserLearningData {
	const updatedData: UserLearningData = {
		...currentData,
		fieldUpdatedAt: {
			...currentData.fieldUpdatedAt,
			lastConfiguration: updatedAt,
		},
		lastConfiguration: {
			scope: currentData.lastConfiguration?.scope ?? DEFAULT_SCOPE,
			order: currentData.lastConfiguration?.order ?? "alphabetical",
			timerDuration:
				currentData.lastConfiguration?.timerDuration ?? DEFAULT_TIMER_DURATION,
			timerEnabled: currentData.lastConfiguration?.timerEnabled ?? false,
			difficulty: currentData.lastConfiguration?.difficulty ?? "hard",
			mode: currentData.lastConfiguration?.mode ?? DEFAULT_GAME_MODE,
			// Sin config previa (usuario nuevo, primera vez que toca un ajuste):
			// arranca en Países (D030). Con config previa sin `gameType` (ya
			// migrada a "flags" por `migrateConfiguration`), se conserva.
			gameType: currentData.lastConfiguration?.gameType ?? DEFAULT_GAME_TYPE,
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

/** Igual que `registerCountryAttempt`, pero para varios países con un solo guardado. Ver `saveReviewResults`. */
export function registerCountryAttempts(
	currentData: UserLearningData,
	attempts: readonly { countryCode: string; isCorrect: boolean }[],
): UserLearningData {
	return saveReviewResults(
		currentData,
		attempts.map(({ countryCode, isCorrect }) => ({
			countryCode,
			grade: isCorrect ? ("good" as const) : ("again" as const),
		})),
	);
}

export function registerRegionGame(
	currentData: UserLearningData,
	region: Region,
	score: number,
	updatedAt: string = new Date().toISOString(),
): UserLearningData {
	const previousScores = currentData.regionGameScores[region] ?? [];

	const regionScores = [...previousScores, score].slice(-MAX_REGION_GAMES);

	const updatedData: UserLearningData = {
		...currentData,
		regionGameScores: {
			...currentData.regionGameScores,
			[region]: regionScores,
		},
		// Sobre la vista de otro juego (`toGameView`) esto es la fecha de ese
		// juego: `fromGameView` la devuelve a su sub-objeto.
		regionGameScoresUpdatedAt: {
			...currentData.regionGameScoresUpdatedAt,
			[region]: updatedAt,
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
 * Los contadores NO se suman. `syncLearningData` corre en cada hidratación
 * autenticada (o sea, en cada recarga), en cada subida y en cada reintento, y
 * `local` ya contiene lo que se subió la vez anterior: sumar duplicaría en
 * cada pasada, sin techo.
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

/** Por país, la fecha más reciente — así una jornada local en curso sobrevive a un login con datos remotos viejos. */
function mergeLastPracticeByCountry(
	remote: LastPracticeByCountry,
	local: LastPracticeByCountry,
): LastPracticeByCountry {
	const merged: LastPracticeByCountry = { ...remote };

	for (const [code, date] of Object.entries(local)) {
		if (!date) continue;
		const current = merged[code];
		if (current === undefined || date > current) {
			merged[code] = date;
		}
	}

	return merged;
}

/** Por continente (o "world"), el menor tiempo — la mejor marca de rush. */
function mergeRegionBestTimes(
	remote: RegionBestTimes,
	local: RegionBestTimes,
): RegionBestTimes {
	const merged: RegionBestTimes = { ...remote };

	for (const [region, timeMs] of Object.entries(local) as [
		PracticeRegion,
		number | undefined,
	][]) {
		if (timeMs === undefined) continue;
		const current = merged[region];
		if (current === undefined || timeMs < current) {
			merged[region] = timeMs;
		}
	}

	return merged;
}

/**
 * Por país, la revisión SRS más reciente (`lastReviewedAt`): así una sesión
 * practicada sin conexión, u otro dispositivo, no pierde lo que revisó. Es un
 * registro "gana el último" por país, con marca de tiempo propia: idempotente
 * y sin duplicar nada (D048). Devuelve `remote` tal cual si no cambia nada.
 */
function mergeCountryHistory(
	remote: CountriesLearningHistory,
	local: CountriesLearningHistory,
): CountriesLearningHistory {
	let merged = remote;

	for (const [code, entry] of Object.entries(local)) {
		const remoteReview = remote[code]?.review ?? null;
		const review = pickMoreRecentReview(remoteReview, entry.review);

		// Empate o sin revisión local: se queda lo remoto (y su entrada).
		if (review === remoteReview && code in remote) continue;
		if (review === null) continue;

		if (merged === remote) merged = { ...remote };
		merged[code] = { ...remote[code], review };
	}

	return merged;
}

/**
 * Igualdad por valor que no depende del orden de las claves: la
 * configuración que arma la UI puede traer las mismas claves en otro orden
 * que la normalizada, y eso no es un cambio del usuario.
 */
function isSameValue(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;

	if (
		typeof a !== "object" ||
		typeof b !== "object" ||
		a === null ||
		b === null ||
		Array.isArray(a) !== Array.isArray(b)
	) {
		return false;
	}

	const aKeys = Object.keys(a).filter(
		(key) => (a as Record<string, unknown>)[key] !== undefined,
	);
	const bKeys = Object.keys(b).filter(
		(key) => (b as Record<string, unknown>)[key] !== undefined,
	);

	return (
		aKeys.length === bKeys.length &&
		aKeys.every((key) =>
			isSameValue(
				(a as Record<string, unknown>)[key],
				(b as Record<string, unknown>)[key],
			),
		)
	);
}

/** Un valor con la fecha (ISO) de su último cambio; `null` = sin fecha (anterior a D055). */
interface Stamped<T> {
	value: T;
	updatedAt: string | null;
}

/**
 * Perfil, última configuración y las tres últimas notas de un continente: el
 * valor no dice cuándo cambió, así que cada uno lleva al lado la fecha de su
 * último cambio (D055):
 *
 * - Fecha en los dos lados: gana la más reciente (empate → lo remoto).
 * - Falta alguna (datos anteriores a D055, o escritos por un cliente viejo):
 *   se decide contra `base`, lo último que este dispositivo sabe que está en la
 *   nube (D049). `local` distinto de la base es un cambio de aquí aún no subido
 *   y gana; si no, gana lo remoto (puede traer el cambio de otro dispositivo).
 *
 * Devuelve el ganador con su fecha. Idempotente: repetir la fusión con el mismo
 * `local` y `base` da lo mismo.
 */
function pickLatest<T>(
	remote: Stamped<T>,
	local: Stamped<T>,
	base: T,
): Stamped<T> {
	if (remote.updatedAt !== null && local.updatedAt !== null) {
		return local.updatedAt > remote.updatedAt ? local : remote;
	}

	return isSameValue(local.value, base) ? remote : local;
}

interface RegionScoresWithDates {
	scores: RegionGameScores;
	updatedAt: Partial<Record<Region, string>>;
}

/** `pickLatest` por continente. Devuelve lo remoto tal cual si no cambia nada. */
function mergeRegionGameScores(
	remote: RegionScoresWithDates,
	local: RegionScoresWithDates,
	base: RegionGameScores,
): RegionScoresWithDates {
	let scores = remote.scores;
	let updatedAt = remote.updatedAt;

	for (const region of Object.keys(local.scores) as Region[]) {
		const remoteSide = {
			value: remote.scores[region],
			updatedAt: remote.updatedAt[region] ?? null,
		};

		const winner = pickLatest(
			remoteSide,
			{
				value: local.scores[region],
				updatedAt: local.updatedAt[region] ?? null,
			},
			base[region],
		);

		if (winner === remoteSide || winner.value === undefined) continue;

		if (scores === remote.scores) scores = { ...remote.scores };
		if (updatedAt === remote.updatedAt) updatedAt = { ...remote.updatedAt };

		scores[region] = winner.value;

		if (winner.updatedAt === null) {
			delete updatedAt[region];
		} else {
			updatedAt[region] = winner.updatedAt;
		}
	}

	return { scores, updatedAt };
}

/**
 * Fusiona el progreso de un juego, cualquiera (ver `getGameProgress`):
 * `countryHistory` por la revisión más reciente de cada país,
 * `regionGameScores` por la fecha de cada continente (D055),
 * `regionBestTimes` por el menor tiempo y `lastPracticeByCountry` por la
 * fecha más reciente.
 */
function mergeGameProgress(
	remote: GameProgress,
	local: GameProgress,
	base: GameProgress,
): GameProgress {
	const regionScores = mergeRegionGameScores(
		{
			scores: remote.regionGameScores,
			updatedAt: remote.regionGameScoresUpdatedAt,
		},
		{
			scores: local.regionGameScores,
			updatedAt: local.regionGameScoresUpdatedAt,
		},
		base.regionGameScores,
	);

	// Mismo orden de claves que `migrateGameProgress` (ver `mergeLearningData`).
	return {
		countryHistory: mergeCountryHistory(
			remote.countryHistory,
			local.countryHistory,
		),
		regionGameScores: regionScores.scores,
		regionBestTimes: mergeRegionBestTimes(
			remote.regionBestTimes,
			local.regionBestTimes,
		),
		lastPracticeByCountry: mergeLastPracticeByCountry(
			remote.lastPracticeByCountry,
			local.lastPracticeByCountry,
		),
		regionGameScoresUpdatedAt: regionScores.updatedAt,
	};
}

/**
 * Gana el lado que ya respondió (así un "sí"/"no" contestado en un
 * dispositivo nunca se vuelve a preguntar en otro). Si los dos respondieron,
 * gana el más antiguo — es la primera respuesta real del usuario.
 */
function mergeDailyReminder(
	remote: DailyReminderPreference,
	local: DailyReminderPreference,
): DailyReminderPreference {
	if (remote.answered && local.answered) {
		return (remote.answeredAt ?? "") <= (local.answeredAt ?? "")
			? remote
			: local;
	}

	if (remote.answered) return remote;
	if (local.answered) return local;

	return remote;
}

/**
 * Fusiona los datos de Supabase (`remote`) con los de este dispositivo
 * (`local`) sin que uno pise al otro. Devuelve el objeto ENTERO a propósito:
 * antes se fusionaban dos campos sueltos y la sincronización los comparaba uno a
 * uno, así que añadir un campo nuevo y olvidarse de él fallaba en silencio
 * (se quedaba en local y se perdía en el siguiente dispositivo).
 *
 * Campo por campo, explícito — nada de spread ciego:
 *
 * - `countryHistory`: por país, la revisión SRS más reciente (D048).
 * - `profile`, `lastConfiguration`, `regionGameScores` (por continente): gana
 *   el cambio más reciente según `fieldUpdatedAt`/`regionGameScoresUpdatedAt`
 *   (D055); sin fecha, contra `base` (D049).
 * - `regionBestTimes`: por continente, el menor tiempo (la mejor marca).
 * - `lastPracticeByCountry`: por país, la fecha más reciente, para que una
 *   jornada en curso local sobreviva a un login con datos remotos viejos.
 * - El sub-objeto de cada juego que no es Banderas (`SUB_GAME_KEYS`): mismas
 *   reglas de arriba, las de `mergeGameProgress`.
 * - `achievements`: unión (nunca se pierde un logro, ni se borra un id
 *   desconocido de una versión más nueva).
 * - `stats` / `sessionHistory`: ver arriba.
 *
 * Idempotente con el mismo `base`: `merge(merge(r, l, b), l, b)` es
 * `merge(r, l, b)`. Es lo que impide que los contadores o las notas se
 * inflen en cada recarga o en cada reintento.
 *
 * Solo para datos de esta misma cuenta (`base` obligatoria). Los del invitado
 * que entra en una cuenta no se fusionan nunca: ver `planSync` (D056).
 */
export function mergeLearningData(
	remote: UserLearningData,
	local: UserLearningData,
	base: UserLearningData,
): UserLearningData {
	// Banderas sigue en el primer nivel, pero se fusiona con las mismas reglas
	// que los demás juegos; abajo se reparte campo a campo en su sitio.
	const flags = mergeGameProgress(
		getGameProgress(remote, "flags"),
		getGameProgress(local, "flags"),
		getGameProgress(base, "flags"),
	);

	const sessionHistory = mergeSessionHistory(
		remote.sessionHistory,
		local.sessionHistory,
	);

	const profile = pickLatest(
		{ value: remote.profile, updatedAt: remote.fieldUpdatedAt.profile },
		{ value: local.profile, updatedAt: local.fieldUpdatedAt.profile },
		base.profile,
	);

	const lastConfiguration = pickLatest(
		{
			value: remote.lastConfiguration,
			updatedAt: remote.fieldUpdatedAt.lastConfiguration,
		},
		{
			value: local.lastConfiguration,
			updatedAt: local.fieldUpdatedAt.lastConfiguration,
		},
		base.lastConfiguration,
	);

	// El orden de las claves replica el de `normalizeLearningData` a propósito:
	// `syncLearningData` compara `JSON.stringify(merged)` con el del remoto para
	// decidir si re-subir, y un orden distinto haría que siempre parecieran
	// diferentes (un push de más en cada sincronización).
	return {
		profile: profile.value,
		countryHistory: flags.countryHistory,
		regionGameScores: flags.regionGameScores,
		regionBestTimes: flags.regionBestTimes,
		lastConfiguration: lastConfiguration.value,
		lastPracticeByCountry: flags.lastPracticeByCountry,
		...buildSubGames((key) =>
			mergeGameProgress(remote[key], local[key], base[key]),
		),
		achievements: mergeAchievements(remote.achievements, local.achievements),
		stats: mergeStats(remote.stats, local.stats, sessionHistory),
		sessionHistory,
		dailyReminder: mergeDailyReminder(
			remote.dailyReminder,
			local.dailyReminder,
		),
		fieldUpdatedAt: {
			profile: profile.updatedAt,
			lastConfiguration: lastConfiguration.updatedAt,
		},
		regionGameScoresUpdatedAt: flags.regionGameScoresUpdatedAt,
	};
}

/** Qué hacer con una sincronización, dada la fila de la nube (`planSync`). */
export interface SyncPlan {
	/** Lo que queda como datos de la cuenta (y en la nube, tras subir si toca). */
	data: UserLearningData;
	/** ¿Hay que subir `data`? */
	push: boolean;
	/** Se descartó lo local: era del invitado y la cuenta ya tenía progreso (D056). */
	discardedLocal: boolean;
}

/**
 * La decisión de cada sincronización, pura:
 *
 * - **La cuenta no tiene progreso en la nube** (recién creada o sin jugar): lo
 *   local — el invitado que acaba de entrar — pasa a ser la cuenta.
 * - **La cuenta ya tiene progreso y no hay base** (`base` `null`: lo local no
 *   es de esta cuenta, es del invitado que acaba de entrar): lo del invitado
 *   **se descarta entero** y queda la nube tal cual (D056, decisión del dueño).
 * - **La cuenta ya tiene progreso y hay base** (datos de esta misma cuenta en
 *   este dispositivo): `mergeLearningData`, y se sube si aporta algo.
 */
export function planSync(
	remote: UserLearningData | null,
	local: UserLearningData,
	base: UserLearningData | null,
): SyncPlan {
	if (!remote || !hasLearningProgress(remote)) {
		return { data: local, push: true, discardedLocal: false };
	}

	if (!base) {
		return { data: remote, push: false, discardedLocal: true };
	}

	const merged = mergeLearningData(remote, local, base);

	// Se compara el objeto ENTERO, no campo por campo: antes había que
	// acordarse de añadir cada campo nuevo a esta condición, y olvidarlo
	// fallaba en silencio (el merge se quedaba en este dispositivo).
	return {
		data: merged,
		push: JSON.stringify(merged) !== JSON.stringify(remote),
		discardedLocal: false,
	};
}

const SYNC_BASE_STORAGE_KEY = "world-flags-sync-base";

interface StoredSyncBase {
	userId: string;
	data: Partial<UserLearningData>;
}

/**
 * La base de sincronización de `userId`: lo último que este dispositivo sabe
 * que está en la nube para esa cuenta (D049). Contra ella se decide qué cambió
 * este dispositivo: `local` distinto de la base = cambios pendientes de subir,
 * que se conservan en `mergeLearningData` aunque la app se haya cerrado o
 * recargado sin conexión. Sin base (primer login aquí), lo local es del
 * invitado (`planSync`, D056).
 *
 * Vive en su propia clave, fuera de `UserLearningData` (como el id de
 * dispositivo): es de este dispositivo y nunca se sube.
 */
export function getSyncBase(userId: string): UserLearningData | null {
	if (typeof window === "undefined") return null;

	try {
		const stored = window.localStorage.getItem(SYNC_BASE_STORAGE_KEY);

		if (!stored) return null;

		const parsed = JSON.parse(stored) as StoredSyncBase;

		// Otra cuenta: su base no dice nada de estos datos.
		if (parsed.userId !== userId || !parsed.data) return null;

		return normalizeLearningData(parsed.data);
	} catch {
		return null;
	}
}

/**
 * Se escribe siempre junto a `saveLearningData`, en la misma tarea: la base y
 * los datos locales tienen que ser una pareja coherente. Si no se puede
 * escribir (cuota), se borra la vieja: sin base la fusión cae a "gana lo
 * remoto" en los campos sin marca de tiempo, que no inventa cambios; una base
 * vieja haría pasar por cambios locales lo que trajo la nube.
 */
export function saveSyncBase(userId: string, data: UserLearningData): void {
	try {
		const stored: StoredSyncBase = { userId, data };
		window.localStorage.setItem(SYNC_BASE_STORAGE_KEY, JSON.stringify(stored));
	} catch {
		clearSyncBase();
	}
}

export function clearSyncBase(): void {
	try {
		window.localStorage.removeItem(SYNC_BASE_STORAGE_KEY);
	} catch {
		// Sin acceso a localStorage no hay base que borrar.
	}
}

/**
 * ¿Hay cambios de este dispositivo que la nube todavía no tiene? Sin base no
 * se puede saber: se responde que no (no hay nada que anunciar ni que
 * proteger que la sincronización no vaya a traer igualmente).
 */
export function hasPendingChanges(
	local: UserLearningData,
	base: UserLearningData | null,
): boolean {
	if (!base) return false;

	return JSON.stringify(local) !== JSON.stringify(base);
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

/** Solo cuenta países del catálogo actual: un código que no conoce no puede dar "196/195 · 101 %". */
export function countLearnedCountries(
	history: CountriesLearningHistory,
): number {
	return Object.entries(history).filter(
		([code, { review }]) =>
			isCatalogCountryCode(code) && isCountryLearned(review),
	).length;
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

/**
 * Nota de "Todo el mundo": media de los 8 continentes ponderada por su número
 * de países (D039). No hay una "nota de mundo" persistida: cada sesión de
 * mundo se registra por continente (`regionBreakdown`), así que se deriva de
 * `regionGameScores`, igual que la nota de cada continente. Solo se calcula
 * cuando los 8 tienen nota — una media parcial sería engañosa al lado de las
 * tarjetas de continente, que sí reflejan el 100% de su alcance.
 */
export function calculateWorldAverage(
	regionGameScores: RegionGameScores,
): number | null {
	const regionAverages = REGIONS.map((region) =>
		calculateRegionAverage(regionGameScores[region]),
	);

	if (regionAverages.some((average) => average === null)) {
		return null;
	}

	const totalCountries = REGIONS.reduce(
		(sum, region) => sum + REGION_COUNTRY_COUNTS[region],
		0,
	);

	const weightedSum = REGIONS.reduce(
		(sum, region, index) =>
			sum + (regionAverages[index] as number) * REGION_COUNTRY_COUNTS[region],
		0,
	);

	return Math.round((weightedSum / totalCountries) * 10) / 10;
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

/** Cálculo puro de `saveReviewResult`, sin persistir — para poder aplicar varios seguidos sin guardar entre medio (ver `saveReviewResults`). */
function applyReviewResult(
	currentData: UserLearningData,
	countryCode: string,
	grade: ReviewGrade,
): UserLearningData {
	const previousReview =
		currentData.countryHistory[countryCode]?.review ?? null;

	return {
		...currentData,
		countryHistory: {
			...currentData.countryHistory,
			[countryCode]: { review: calculateNextReview(previousReview, grade) },
		},
	};
}

export function saveReviewResult(
	currentData: UserLearningData,
	countryCode: string,
	grade: ReviewGrade,
): UserLearningData {
	const updatedData = applyReviewResult(currentData, countryCode, grade);

	saveLearningData(updatedData);
	return updatedData;
}

/**
 * Igual que `saveReviewResult`, pero para VARIOS países en una sola llamada
 * con un solo guardado en `localStorage` (un `JSON.stringify` + `setItem` de
 * la fila entera, no uno por país). Pensada para revelar/calificar muchos
 * países de golpe — por ejemplo, marcar como fallados todos los que faltaban
 * al rendirse en una sesión que cubre "Todo el mundo" (hasta ~196), donde
 * llamar a `saveReviewResult` uno por uno repetiría ese guardado ~196 veces
 * seguidas para un solo evento del usuario.
 */
export function saveReviewResults(
	currentData: UserLearningData,
	entries: readonly { countryCode: string; grade: ReviewGrade }[],
): UserLearningData {
	if (entries.length === 0) {
		return currentData;
	}

	let updatedData = currentData;

	for (const { countryCode, grade } of entries) {
		updatedData = applyReviewResult(updatedData, countryCode, grade);
	}

	saveLearningData(updatedData);
	return updatedData;
}

/**
 * Solo países del catálogo actual: un código que no conoce inflaría
 * "Práctica diaria (N)" y, al llegar a la cabeza de la cola, no habría
 * bandera ni nombre que mostrar.
 */
export function getDueCountries(history: CountriesLearningHistory): string[] {
	return Object.keys(history).filter(
		(code) =>
			isCatalogCountryCode(code) && isDue(history[code]?.review ?? null),
	);
}
