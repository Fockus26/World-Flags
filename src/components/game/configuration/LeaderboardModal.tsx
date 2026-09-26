import { Medal } from "iconoir-react";
import { useEffect, useRef, useState } from "react";
import { AnimatedHeight } from "@/components/ui/AnimatedHeight";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingAnnouncer } from "@/components/ui/LoadingAnnouncer";
import { Modal } from "@/components/ui/Modal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import {
	type GameType,
	getLeaderboardScope,
	LEADERBOARD_REGIONS,
	type PracticeRegion,
	REGION_LABELS,
} from "@/types/country";
import { getAvatarUrl } from "@/utils/avatar";
import {
	fetchLeaderboard,
	isNetworkFailure,
	type LeaderboardEntry,
} from "@/utils/cloud-storage";
import { formatElapsedTime } from "@/utils/learning-storage";
import { GameTypeToggle } from "./GameTypeToggle";
import { UserAvatar } from "./UserAvatar";

interface LeaderboardModalProps {
	isOpen: boolean;
	onClose: () => void;
	/** El juego activo en la configuración: con qué arranca el selector del ranking. */
	defaultGameType: GameType;
	/**
	 * Con qué alcance arranca el selector de continente (D141). Por defecto
	 * "Todo el mundo"; quien abra el ranking justo después de jugar un
	 * continente puede pasarlo para enseñar ese.
	 */
	defaultRegion?: PracticeRegion;
}

/** Cuántas filas enseña el ranking (D077). Si estás más abajo, tu fila va aparte, bajo un separador. */
const TOP_COUNT = 20;

/**
 * Filas del skeleton mientras llega el ranking. No se sabe cuántas vendrán:
 * cinco es el alto del ranking de antes, y cada fila mide lo mismo que una
 * real (mismo árbol, mismas cajas), así que al llegar los datos no se mueve
 * nada de lo que ya estaba (D077).
 */
const SKELETON_ROW_COUNT = 5;

/** Caja del avatar de cada fila: la comparten la imagen, la inicial y su skeleton. */
const ROW_AVATAR_CLASS = "size-8 shrink-0 rounded-full";

/** Clases de una fila, compartidas por la real y la de skeleton. */
const ROW_CLASS =
	"flex items-center justify-between gap-3 rounded-md px-2 py-2 sm:px-3";

/**
 * Puesto, avatar y nombre (D150): entre el puesto y el avatar siempre
 * `gap-3` (antes `gap-2.5`), para que el número no se pegue al avatar. Bajo
 * `sm` el resto va a `gap-2` y la fila a `px-2`: a 320 px cada píxel es del
 * nombre, que es lo que se trunca.
 */
const ROW_LEAD_CLASS = "flex min-w-0 items-center gap-2 sm:gap-3";

/** Caja del puesto (D150): el ancho lo pone `rankColumnWidth`, igual en todas las filas. */
const RANK_CLASS = "me-1 shrink-0 text-right font-black tabular-nums sm:me-0";

/**
 * Ancho de la columna del puesto (D150): tantos `ch` como caracteres tenga
 * el puesto más alto que se ve ("#" + dígitos), el mismo para todas las filas
 * y para la tuya bajo el separador. Con un `w-7` fijo, "#100" se salía hacia
 * el avatar.
 */
function rankColumnWidth(highestRank: number): string {
	return `${String(highestRank).length + 1}ch`;
}

/**
 * El podio (D147–D148): cada puesto con su medalla. El color nunca va solo:
 * el número sigue ahí como texto y la medalla es un icono (decorativo).
 * Clases completas y literales para que Tailwind las encuentre.
 *
 * - `row`: fondo de la fila de otra persona y su hover (D149: el tinte se
 *   ahonda mezclando un 6 % del texto, como el hover de los botones `soft`).
 * - `ownRing`: tu fila en el podio conserva su fondo y suma un borde del
 *   color del puesto.
 * - `rank`: el número, en el tono de la medalla (≥4,5:1 en los dos temas).
 * - `badge`: la medalla sobre la esquina del avatar.
 */
const PODIUM_STYLES: Record<
	1 | 2 | 3,
	{ row: string; ownRing: string; rank: string; badge: string }
> = {
	1: {
		row: "bg-medal-gold-soft hover:bg-[color-mix(in_oklab,var(--color-medal-gold-soft),var(--color-surface-soft)_6%)]",
		ownRing: "ring-2 ring-inset ring-medal-gold",
		rank: "text-medal-gold",
		badge: "border-medal-gold text-medal-gold",
	},
	2: {
		row: "bg-medal-silver-soft hover:bg-[color-mix(in_oklab,var(--color-medal-silver-soft),var(--color-surface-soft)_6%)]",
		ownRing: "ring-2 ring-inset ring-medal-silver",
		rank: "text-medal-silver",
		badge: "border-medal-silver text-medal-silver",
	},
	3: {
		row: "bg-medal-bronze-soft hover:bg-[color-mix(in_oklab,var(--color-medal-bronze-soft),var(--color-surface-soft)_6%)]",
		ownRing: "ring-2 ring-inset ring-medal-bronze",
		rank: "text-medal-bronze",
		badge: "border-medal-bronze text-medal-bronze",
	},
};

function getPodiumStyle(rank: number) {
	return rank === 1 || rank === 2 || rank === 3 ? PODIUM_STYLES[rank] : null;
}

/**
 * Fondo de la fila (D149). Hover solo visual: la fila no es enfocable ni
 * enseña nada nuevo, así que `cursor` normal. `hover:` es la variante de D103
 * (ratón, o mientras dura el toque: sin hover pegado). La transición de
 * color usa los 150 ms de siempre; con movimiento reducido la acorta el
 * bloque global.
 */
const ROW_BG_OWN =
	"bg-primary-soft hover:bg-[color-mix(in_oklab,var(--color-primary-soft),var(--color-surface-soft)_6%)]";
const ROW_BG_DEFAULT = "hover:bg-surface-hover";

/**
 * Sin el punto final: en un continente se le añade "de Europa" (D141).
 * ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #10, #21 y #44).
 */
const LEADERBOARD_DESCRIPTIONS: Record<GameType, string> = {
	countries: "Mejor tiempo en modo competitivo practicando todos los países",
	flags: "Mejor tiempo en modo competitivo practicando todas las banderas",
	capitals: "Mejor tiempo en modo competitivo practicando todas las capitales",
};

/**
 * "de Europa", "del Caribe"…: para la descripción y el anuncio del cambio de
 * continente (D141). ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #44).
 */
const REGION_PHRASES: Record<PracticeRegion, string> = {
	world: "de todo el mundo",
	"north-america": "de Norteamérica",
	"central-america": "de Centroamérica",
	caribbean: "del Caribe",
	"south-america": "de Sudamérica",
	europe: "de Europa",
	oceania: "de Oceanía",
	asia: "de Asia",
	africa: "de África",
};

/** Opciones del selector de continente: los nombres de `RegionSelector`. */
const REGION_OPTIONS = LEADERBOARD_REGIONS.map((region) => ({
	value: region,
	label: REGION_LABELS[region],
}));

/** Id de tu fila en el ranking de demostración (D117): la demo no depende de tener sesión. */
const DEMO_OWN_ID = "demo-ranking-tu";

/**
 * Solo en desarrollo (D117): el valor de `?demo-ranking`, o `null` si no
 * está. En el build de producción `import.meta.env.DEV` es `false` y esto
 * es siempre `null`.
 */
function readDemoParam(): string | null {
	if (!import.meta.env.DEV || typeof window === "undefined") return null;

	return new URLSearchParams(window.location.search).get("demo-ranking");
}

/**
 * Pide el ranking de un scope. En desarrollo con `?demo-ranking` lo sirve
 * `leaderboard-demo.ts` (30 personas falsas, sin tocar la base). El `import()`
 * va dentro de la condición de `DEV`: en producción la rama entera se elimina
 * y el archivo de la demo no se empaqueta.
 */
function loadLeaderboard(scope: string): Promise<LeaderboardEntry[]> {
	if (import.meta.env.DEV) {
		const demoParam = readDemoParam();

		if (demoParam !== null) {
			return import("./leaderboard-demo").then(({ fetchDemoLeaderboard }) =>
				fetchDemoLeaderboard(scope, demoParam, DEMO_OWN_ID),
			);
		}
	}

	return fetchLeaderboard(scope);
}

function LeaderboardRow({
	rank,
	rankWidth,
	entry,
	isMe,
	isOnline,
}: {
	rank: number;
	/** Ancho de la columna del puesto, compartido por toda la lista (D150). */
	rankWidth: string;
	entry: LeaderboardEntry;
	isMe: boolean;
	isOnline: boolean;
}) {
	const avatarUrl = entry.avatar
		? getAvatarUrl(entry.avatar.style, entry.avatar.seed)
		: null;
	const podium = getPodiumStyle(rank);

	// Tu fila: fondo y texto de marca (`primary-hover` como texto: `primary`
	// sobre `primary-soft` daba 3,97:1 en claro, D148). En el podio suma el
	// borde del color del puesto; la de otra persona en el podio lleva el
	// tinte de su medalla.
	const rowColors = isMe
		? `${ROW_BG_OWN} text-primary-hover ${podium?.ownRing ?? ""}`
		: `${podium?.row ?? ROW_BG_DEFAULT} text-surface-soft`;

	return (
		<li className={`${ROW_CLASS} ${rowColors} transition-colors duration-150`}>
			<span className={ROW_LEAD_CLASS}>
				<span
					className={`${RANK_CLASS} ${podium?.rank ?? ""}`}
					style={{ width: rankWidth }}
				>
					#{rank}
				</span>
				<span className="relative flex shrink-0">
					{/* Decorativo: el nombre va al lado. Al volver la red se remonta
					    para reintentar un avatar que no cargó (como en `UserSummary`). */}
					<UserAvatar
						key={`${avatarUrl}|${isOnline}`}
						src={avatarUrl}
						name={entry.displayName}
						className={ROW_AVATAR_CLASS}
						initialClassName="text-sm"
						loading="lazy"
					/>
					{/* La medalla (D148) es decorativa: el puesto ya se lee en "#1". */}
					{podium && (
						<span
							className={`absolute -right-1 -bottom-1 grid size-4.5 place-items-center rounded-full border bg-overlay ${podium.badge}`}
							aria-hidden="true"
						>
							<Medal className="size-3" strokeWidth={2} />
						</span>
					)}
				</span>
				<span className="truncate font-bold">{entry.displayName}</span>
				{/* Tu fila no se distingue solo por el color. ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #27). */}
				{isMe && (
					<span className="shrink-0 text-[0.8rem] font-extrabold">(tú)</span>
				)}
			</span>
			<span className="shrink-0 font-extrabold tabular-nums">
				{formatElapsedTime(entry.bestTimeMs)}
			</span>
		</li>
	);
}

/**
 * Fila de carga con la forma de una real: puesto, avatar redondo, nombre y
 * tiempo. Las medidas salen del contenido de referencia invisible de
 * `Skeleton` (D042), no de anchos inventados.
 *
 * `immediate` (D115): el ranking va siempre a la red, así que la espera de
 * 300 ms solo dejaba ver un hueco del alto del skeleton sin nada dentro.
 */
function LeaderboardSkeletonRow({
	rank,
	rankWidth,
}: {
	rank: number;
	rankWidth: string;
}) {
	return (
		<li className={`${ROW_CLASS} text-surface-soft`} aria-hidden="true">
			<span className={ROW_LEAD_CLASS}>
				<span className={RANK_CLASS} style={{ width: rankWidth }}>
					<Skeleton shape="line" className="ml-auto rounded-sm" immediate>
						#{rank}
					</Skeleton>
				</span>
				<Skeleton className={ROW_AVATAR_CLASS} immediate />
				<Skeleton shape="line" className="rounded-sm font-bold" immediate>
					Jugador de ejemplo
				</Skeleton>
			</span>
			<Skeleton
				shape="line"
				className="shrink-0 rounded-sm font-extrabold tabular-nums"
				immediate
			>
				0:00.00
			</Skeleton>
		</li>
	);
}

export function LeaderboardModal({
	isOpen,
	onClose,
	defaultGameType,
	defaultRegion = "world",
}: LeaderboardModalProps) {
	const { user, status } = useAuth();
	const { isOnline } = useSyncStatus();
	const [gameType, setGameType] = useState<GameType>(defaultGameType);
	const [region, setRegion] = useState<PracticeRegion>(defaultRegion);
	/**
	 * Anuncio del cambio de continente para lectores de pantalla (D141): la
	 * lista cambia entera y el `LoadingAnnouncer` calla si la carga es rápida.
	 */
	const [regionAnnouncement, setRegionAnnouncement] = useState("");
	/** Se eligió otro continente y falta anunciarlo cuando haya algo que leer. */
	const announceRegionRef = useRef(false);
	const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	/** El ranking es público y vive solo en la nube: sin conexión no hay nada que mostrar (D052). */
	const [isOffline, setIsOffline] = useState(false);

	// Cada vez que se abre el modal, arranca en el juego activo en ese
	// momento en la configuración — no se queda pegado a lo último que se
	// vio en una apertura anterior.
	useEffect(() => {
		if (isOpen) {
			setGameType(defaultGameType);
			setRegion(defaultRegion);
			setRegionAnnouncement("");
			announceRegionRef.current = false;
		}
	}, [isOpen, defaultGameType, defaultRegion]);

	// Un scope por juego (D033), por regla de castigo (D076) y por continente (D137).
	const scope = getLeaderboardScope(gameType, region);

	useEffect(() => {
		if (!isOpen) return;

		let cancelled = false;
		setEntries(null);
		setError(null);
		setIsOffline(!isOnline);

		// El anuncio del cambio de continente sale cuando ya hay algo que leer
		// (filas, vacío, error o sin conexión), no al elegir: así no se pisa
		// con "Cargando el ranking…". ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #45).
		const announceRegion = () => {
			if (!announceRegionRef.current) return;
			announceRegionRef.current = false;
			setRegionAnnouncement(`Mostrando el ranking ${REGION_PHRASES[region]}.`);
		};

		// Sin conexión ni se intenta; al volver, este efecto se repite solo
		// (`isOnline` en las dependencias) y el ranking aparece.
		if (!isOnline) {
			announceRegion();
			return;
		}

		loadLeaderboard(scope)
			.then((result) => {
				if (cancelled) return;
				setEntries(result);
				announceRegion();
			})
			.catch((fetchError: unknown) => {
				if (cancelled) return;
				announceRegion();

				if (isNetworkFailure(fetchError)) {
					setIsOffline(true);
				} else {
					setError("No se pudo cargar el ranking. Intenta de nuevo más tarde.");
				}
			});

		return () => {
			cancelled = true;
		};
	}, [isOpen, scope, region, isOnline]);

	const isLoading = isOpen && !error && !isOffline && entries === null;

	// En la demo (solo dev, D117) tu fila es la suya, tengas sesión o no.
	// `DEV &&` explícito aquí, no solo dentro de `readDemoParam`: así el
	// minificador ve la rama muerta y `DEMO_OWN_ID` tampoco llega a `dist/`.
	const ownId =
		import.meta.env.DEV && readDemoParam() !== null ? DEMO_OWN_ID : user?.id;
	const myIndex = entries?.findIndex((entry) => entry.userId === ownId) ?? -1;
	const myRank = myIndex >= 0 ? myIndex + 1 : null;
	const isMeInTop = myRank !== null && myRank <= TOP_COUNT;
	// El puesto más alto que se ve: el último del top o el tuyo, si va aparte (D150).
	const highestRank = Math.max(
		Math.min(entries?.length ?? 0, TOP_COUNT),
		myRank ?? 0,
	);
	const rankWidth = rankColumnWidth(highestRank);

	// Ancho del modal (D150): 34 rem, para que el puesto, el avatar y el nombre
	// respiren; a 320 px sigue mandando el 92vw. `max-w-none` quita el tope de
	// `modal__dialog--md` (28 rem), como en `AchievementsModal`: sin él, el
	// `30rem` de antes nunca llegaba a aplicarse.
	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			className="w-[min(34rem,92vw)] max-w-none text-left"
			ariaLabelledby="leaderboard-title"
		>
			<header className="mb-3 flex items-center justify-between gap-3">
				<h2 id="leaderboard-title" className="m-0">
					Ranking — {REGION_LABELS[region]}
				</h2>
				<ModalCloseButton onClose={onClose} />
			</header>

			<GameTypeToggle
				legend="Ranking de"
				value={gameType}
				onChange={setGameType}
				className="mb-3"
			/>

			{/* Continente (D141): un Select y no pestañas, porque 9 opciones no
			    caben a 320 px. ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #44). */}
			<Select
				id="leaderboard-region"
				label="Continente"
				options={REGION_OPTIONS}
				value={region}
				onChange={(selected) => {
					const next = selected as PracticeRegion;
					if (next === region) return;
					setRegion(next);
					announceRegionRef.current = true;
				}}
				className="mb-3"
			/>

			<p className="mt-0 mb-3 text-[0.85rem] text-text-placeholder">
				{LEADERBOARD_DESCRIPTIONS[gameType]}
				{region === "world" ? "" : ` ${REGION_PHRASES[region]}`}.
			</p>

			<p role="status" className="sr-only">
				{regionAnnouncement}
			</p>

			{/* Fuera de la lista ocupada: si no, el anuncio no se oiría (D042).
			    ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #27). */}
			<LoadingAnnouncer
				isLoading={isLoading}
				loadingMessage="Cargando el ranking…"
				readyMessage="Ranking cargado."
			/>

			{/* Lo que cambia con la carga (skeleton, filas, avisos) cambia de
			    golpe y la caja anima su alto hacia el nuevo (D116): de 5 filas
			    de skeleton a 20 filas, o a una sola, sin salto. */}
			<AnimatedHeight>
				{error && (
					<FeedbackMessage variant="danger" size="sm" role="alert">
						{error}
					</FeedbackMessage>
				)}

				{!error && isOffline && (
					<p className="flex items-start gap-2 text-[0.85rem] text-text-placeholder">
						<span aria-hidden="true">📡</span>
						<span>
							Sin conexión: el ranking necesita internet. Aparecerá aquí en
							cuanto vuelvas a estar en línea.
						</span>
					</p>
				)}

				{isLoading && (
					<ol
						className="m-0 flex list-none flex-col gap-1 p-0"
						aria-busy="true"
						aria-labelledby="leaderboard-title"
					>
						{/* Columna del puesto del ancho de un top lleno ("#20", D150): es lo
						    habitual, y así al llegar los datos el avatar no se mueve. */}
						{Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
							<LeaderboardSkeletonRow
								// biome-ignore lint/suspicious/noArrayIndexKey: filas de relleno fijas, sin identidad propia
								key={index}
								rank={index + 1}
								rankWidth={rankColumnWidth(TOP_COUNT)}
							/>
						))}
					</ol>
				)}

				{!error && entries !== null && entries.length === 0 && (
					<p className="text-[0.85rem] text-text-placeholder">
						Todavía nadie tiene un tiempo registrado. ¡Sé el primero!
					</p>
				)}

				{!error && entries !== null && entries.length > 0 && (
					<ol
						className="m-0 flex list-none flex-col gap-1 p-0"
						aria-labelledby="leaderboard-title"
					>
						{entries.slice(0, TOP_COUNT).map((entry, index) => (
							<LeaderboardRow
								key={entry.userId}
								rank={index + 1}
								rankWidth={rankWidth}
								entry={entry}
								isMe={entry.userId === ownId}
								isOnline={isOnline}
							/>
						))}
					</ol>
				)}

				{!error && entries !== null && myRank !== null && !isMeInTop && (
					<>
						<hr className="my-3 border-surface-border" />
						{/* `start`: el número de la lista es tu puesto real, no "1". */}
						<ol
							className="m-0 flex list-none flex-col gap-1 p-0"
							start={myRank}
							aria-label="Tu puesto"
						>
							<LeaderboardRow
								rank={myRank}
								rankWidth={rankWidth}
								entry={entries[myIndex]}
								isMe
								isOnline={isOnline}
							/>
						</ol>
					</>
				)}

				{status === "authenticated" &&
					entries !== null &&
					entries.length > 0 &&
					myRank === null && (
						<p className="mt-3 mb-0 text-[0.8rem] text-text-placeholder">
							Todavía no tienes un tiempo registrado: completa una práctica
							competitiva de "{REGION_LABELS[region]}" para entrar al ranking.
						</p>
					)}
			</AnimatedHeight>

			{status !== "authenticated" && (
				<p className="mt-3 mb-0 text-[0.8rem] text-text-placeholder">
					Inicia sesión para poder aparecer en el ranking.
				</p>
			)}
		</Modal>
	);
}
