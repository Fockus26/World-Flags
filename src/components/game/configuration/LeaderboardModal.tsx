import { useEffect, useState } from "react";
import { AnimatedHeight } from "@/components/ui/AnimatedHeight";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingAnnouncer } from "@/components/ui/LoadingAnnouncer";
import { Modal } from "@/components/ui/Modal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { type GameType, LEADERBOARD_SCOPES } from "@/types/country";
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
	"flex items-center justify-between gap-3 rounded-md px-3 py-2";

/** ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #10 y #21). */
const LEADERBOARD_DESCRIPTIONS: Record<GameType, string> = {
	countries: "Mejor tiempo en modo competitivo practicando todos los países.",
	flags: "Mejor tiempo en modo competitivo practicando todas las banderas.",
	capitals: "Mejor tiempo en modo competitivo practicando todas las capitales.",
};

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
	entry,
	isMe,
	isOnline,
}: {
	rank: number;
	entry: LeaderboardEntry;
	isMe: boolean;
	isOnline: boolean;
}) {
	const avatarUrl = entry.avatar
		? getAvatarUrl(entry.avatar.style, entry.avatar.seed)
		: null;

	return (
		<li
			className={`${ROW_CLASS} ${
				isMe ? "bg-primary-soft text-primary" : "text-surface-soft"
			}`}
		>
			<span className="flex min-w-0 items-center gap-2.5">
				<span className="w-7 shrink-0 text-right font-black tabular-nums">
					#{rank}
				</span>
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
function LeaderboardSkeletonRow({ rank }: { rank: number }) {
	return (
		<li className={`${ROW_CLASS} text-surface-soft`} aria-hidden="true">
			<span className="flex min-w-0 items-center gap-2.5">
				<span className="w-7 shrink-0 text-right font-black tabular-nums">
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
}: LeaderboardModalProps) {
	const { user, status } = useAuth();
	const { isOnline } = useSyncStatus();
	const [gameType, setGameType] = useState<GameType>(defaultGameType);
	const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	/** El ranking es público y vive solo en la nube: sin conexión no hay nada que mostrar (D052). */
	const [isOffline, setIsOffline] = useState(false);

	// Cada vez que se abre el modal, arranca en el juego activo en ese
	// momento en la configuración — no se queda pegado a lo último que se
	// vio en una apertura anterior.
	useEffect(() => {
		if (isOpen) setGameType(defaultGameType);
	}, [isOpen, defaultGameType]);

	useEffect(() => {
		if (!isOpen) return;

		let cancelled = false;
		setEntries(null);
		setError(null);
		setIsOffline(!isOnline);

		// Sin conexión ni se intenta; al volver, este efecto se repite solo
		// (`isOnline` en las dependencias) y el ranking aparece.
		if (!isOnline) return;

		// Un scope por juego (D033), y por regla de castigo (D076).
		loadLeaderboard(LEADERBOARD_SCOPES[gameType])
			.then((result) => {
				if (!cancelled) setEntries(result);
			})
			.catch((fetchError: unknown) => {
				if (cancelled) return;

				if (isNetworkFailure(fetchError)) {
					setIsOffline(true);
				} else {
					setError("No se pudo cargar el ranking. Intenta de nuevo más tarde.");
				}
			});

		return () => {
			cancelled = true;
		};
	}, [isOpen, gameType, isOnline]);

	const isLoading = isOpen && !error && !isOffline && entries === null;

	// En la demo (solo dev, D117) tu fila es la suya, tengas sesión o no.
	// `DEV &&` explícito aquí, no solo dentro de `readDemoParam`: así el
	// minificador ve la rama muerta y `DEMO_OWN_ID` tampoco llega a `dist/`.
	const ownId =
		import.meta.env.DEV && readDemoParam() !== null ? DEMO_OWN_ID : user?.id;
	const myIndex = entries?.findIndex((entry) => entry.userId === ownId) ?? -1;
	const myRank = myIndex >= 0 ? myIndex + 1 : null;
	const isMeInTop = myRank !== null && myRank <= TOP_COUNT;

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			className="w-[min(30rem,92vw)] text-left"
			ariaLabelledby="leaderboard-title"
		>
			<header className="mb-3 flex items-center justify-between gap-3">
				<h2 id="leaderboard-title" className="m-0">
					Ranking — Todo el mundo
				</h2>
				<ModalCloseButton onClose={onClose} />
			</header>

			<GameTypeToggle
				legend="Ranking de"
				value={gameType}
				onChange={setGameType}
				className="mb-3"
			/>

			<p className="mt-0 mb-3 text-[0.85rem] text-text-placeholder">
				{LEADERBOARD_DESCRIPTIONS[gameType]}
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
						{Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
							<LeaderboardSkeletonRow
								// biome-ignore lint/suspicious/noArrayIndexKey: filas de relleno fijas, sin identidad propia
								key={index}
								rank={index + 1}
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
							competitiva de "Todo el mundo" para entrar al ranking.
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
