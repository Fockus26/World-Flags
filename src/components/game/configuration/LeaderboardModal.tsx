import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { type GameType, LEADERBOARD_SCOPES } from "@/types/country";
import {
	fetchLeaderboard,
	isNetworkFailure,
	type LeaderboardEntry,
} from "@/utils/cloud-storage";
import { formatElapsedTime } from "@/utils/learning-storage";
import { GameTypeToggle } from "./GameTypeToggle";

interface LeaderboardModalProps {
	isOpen: boolean;
	onClose: () => void;
	/** El juego activo en la configuración: con qué arranca el selector del ranking. */
	defaultGameType: GameType;
}

const TOP_COUNT = 5;

/** ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #10 y #21). */
const LEADERBOARD_DESCRIPTIONS: Record<GameType, string> = {
	countries: "Mejor tiempo en modo competitivo practicando todos los países.",
	flags: "Mejor tiempo en modo competitivo practicando todas las banderas.",
	capitals: "Mejor tiempo en modo competitivo practicando todas las capitales.",
};

function LeaderboardRow({
	rank,
	entry,
	isMe,
}: {
	rank: number;
	entry: LeaderboardEntry;
	isMe: boolean;
}) {
	return (
		<li
			className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 ${
				isMe ? "bg-primary-soft text-primary" : "text-surface-soft"
			}`}
		>
			<span className="flex min-w-0 items-center gap-2.5">
				<span className="w-6 shrink-0 text-right font-black tabular-nums">
					#{rank}
				</span>
				<span className="truncate font-bold">{entry.displayName}</span>
			</span>
			<span className="shrink-0 font-extrabold tabular-nums">
				{formatElapsedTime(entry.bestTimeMs)}
			</span>
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

		// Un scope por juego (D033): la PK (user_id, scope) de
		// `leaderboard_entries` ya lo soporta sin migración.
		fetchLeaderboard(LEADERBOARD_SCOPES[gameType])
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

	const myIndex =
		entries?.findIndex((entry) => entry.userId === user?.id) ?? -1;
	const myRank = myIndex >= 0 ? myIndex + 1 : null;
	const isMeInTop = myRank !== null && myRank <= TOP_COUNT;

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			className="w-[min(28rem,92vw)] text-left"
			ariaLabelledby="leaderboard-title"
		>
			<header className="mb-3 flex items-center justify-between gap-3">
				<h2 id="leaderboard-title" className="m-0">
					Ranking — Todo el mundo
				</h2>
				<Button
					variant="text"
					color="danger"
					type="button"
					fullWidth={false}
					onClick={onClose}
				>
					Cerrar
				</Button>
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

			{error && (
				<FeedbackMessage variant="danger" size="sm" role="alert">
					{error}
				</FeedbackMessage>
			)}

			{!error && isOffline && (
				<p className="flex items-start gap-2 text-[0.85rem] text-text-placeholder">
					<span aria-hidden="true">📡</span>
					<span>
						Sin conexión: el ranking necesita internet. Aparecerá aquí en cuanto
						vuelvas a estar en línea.
					</span>
				</p>
			)}

			{!error && !isOffline && entries === null && (
				<p className="text-[0.85rem] text-text-placeholder">Cargando…</p>
			)}

			{!error && entries !== null && entries.length === 0 && (
				<p className="text-[0.85rem] text-text-placeholder">
					Todavía nadie tiene un tiempo registrado. ¡Sé el primero!
				</p>
			)}

			{!error && entries !== null && entries.length > 0 && (
				<ol className="m-0 flex list-none flex-col gap-1 p-0">
					{entries.slice(0, TOP_COUNT).map((entry, index) => (
						<LeaderboardRow
							key={entry.userId}
							rank={index + 1}
							entry={entry}
							isMe={entry.userId === user?.id}
						/>
					))}
				</ol>
			)}

			{!error && entries !== null && myRank !== null && !isMeInTop && (
				<>
					<hr className="my-3 border-surface-border" />
					<ol className="m-0 flex list-none flex-col gap-1 p-0">
						<LeaderboardRow rank={myRank} entry={entries[myIndex]} isMe />
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

			{status !== "authenticated" && (
				<p className="mt-3 mb-0 text-[0.8rem] text-text-placeholder">
					Inicia sesión para poder aparecer en el ranking.
				</p>
			)}
		</Modal>
	);
}
