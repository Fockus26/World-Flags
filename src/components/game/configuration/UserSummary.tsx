import { motion } from "framer-motion";
import { useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { motionVariants } from "@/styles/animations";
import { getCurrentStreak } from "@/utils/learning-storage";

interface UserSummaryProps {
	name: string;
	avatarUrl: string;
	accountLabel: string;
	learningProgress: number;
	learnedCountries: number;
	totalCountries: number;
	activeDays: readonly string[];
	isStreakOpen: boolean;
	onToggleStreak: () => void;
	onOpenModal: () => void;
	/** Carga inicial (D042): mismo árbol y misma caja, con skeleton en cada
	 *  dato. Los props llegan con los valores por defecto y solo se usan,
	 *  invisibles, para dar el ancho de cada skeleton. */
	isLoading?: boolean;
	className?: string;
}

const MOBILE_NAME_MAX_CHARS = 15;

/** Tamaño y forma del avatar: compartido por la imagen y su skeleton. */
const AVATAR_BOX_CLASS = "size-13 sm:size-16 shrink-0 rounded-full";

/**
 * Posición del badge de racha, compartida con su skeleton. `left`/`top` fijos
 * que coinciden con el tamaño del avatar (52px en mobile, 64px en sm+) — ver
 * el comentario del badge abajo.
 */
const STREAK_BADGE_BOX_CLASS =
	"absolute left-8 -top-1.5 sm:left-11 z-10 h-6 min-w-6 rounded-full border-2 border-surface";

/** Por caracteres reales (no unidades UTF-16), para no partir un emoji a la mitad. */
function truncateName(name: string): string {
	const characters = [...name];
	return characters.length > MOBILE_NAME_MAX_CHARS
		? `${characters.slice(0, MOBILE_NAME_MAX_CHARS).join("")}…`
		: name;
}

/**
 * El avatar viene de dicebear (CDN externo): aunque los datos ya estén, la
 * imagen tarda en llegar, o no llega sin red. Mientras tanto se ve el
 * skeleton (que, como todos, espera `SKELETON_DELAY_MS` antes de verse: un
 * avatar en caché no parpadea); si falla, la inicial del nombre en vez de un
 * hueco. `UserSummary` le pone `key` con `src` para que un avatar nuevo vuelva
 * a empezar en "cargando".
 *
 * El skeleton se quita, no queda debajo: los avatares de dicebear tienen
 * fondo transparente y el brillo se vería a través de la imagen.
 *
 * Sin conexión (D052): un avatar ya visto sale de la caché HTTP del navegador
 * (dicebear lo sirve con `max-age` de ~1 año); si no está, en vez del disco
 * vacío se ve la inicial del nombre. Decorativa: el nombre ya va en el
 * `aria-label` del botón.
 */
function AvatarImage({ src, name }: { src: string; name: string }) {
	const [status, setStatus] = useState<"loading" | "loaded" | "error">(
		"loading",
	);

	const initial = [...name.trim()][0]?.toUpperCase() ?? "";

	return (
		<span className={`relative ${AVATAR_BOX_CLASS}`}>
			{status === "loading" && (
				<Skeleton className="absolute inset-0 rounded-full" />
			)}

			{status === "error" && (
				<span
					className="absolute inset-0 grid place-items-center rounded-full bg-primary-soft text-xl font-black text-surface-soft sm:text-2xl"
					aria-hidden="true"
				>
					{initial}
				</span>
			)}

			<img
				className={`size-full rounded-full object-cover ${status === "loaded" ? "" : "opacity-0"}`}
				src={src}
				alt=""
				aria-hidden="true"
				onLoad={() => setStatus("loaded")}
				onError={() => setStatus("error")}
			/>
		</span>
	);
}

export function UserSummary({
	name,
	avatarUrl,
	accountLabel,
	learningProgress,
	learnedCountries,
	totalCountries,
	activeDays,
	isStreakOpen,
	onToggleStreak,
	onOpenModal,
	isLoading = false,
	className,
}: UserSummaryProps) {
	// Al volver la red, un avatar que no cargó se vuelve a pedir (el `key`
	// remonta la imagen: el navegador no reintenta un `src` fallido solo).
	const { isOnline } = useSyncStatus();
	const currentStreak = getCurrentStreak(activeDays);
	const streakLabel =
		currentStreak === 1 ? "1 día seguido" : `${currentStreak} días seguidos`;
	const progressLabel = `${learningProgress}% · ${learnedCountries}/${totalCountries}`;

	return (
		<motion.div
			className={`relative flex w-full items-center ${className ?? ""}`}
			variants={motionVariants.contentEnter}
			initial={false}
			animate="visible"
			// Los props aún son los por defecto: nada de esto es del usuario.
			inert={isLoading}
		>
			<button
				type="button"
				className="group flex w-full touch-manipulation cursor-pointer items-center gap-3 rounded-full bg-surface pr-4 text-left text-surface-soft transition-[background-color,transform] duration-180 ease-in-out hover:bg-surface-hover active:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-surface-soft"
				aria-label={`${name}, progreso ${learningProgress} por ciento. Abrir perfil y configuración.`}
				onClick={onOpenModal}
			>
				{isLoading ? (
					<Skeleton className={AVATAR_BOX_CLASS} />
				) : (
					<AvatarImage
						key={`${avatarUrl}|${isOnline}`}
						src={avatarUrl}
						name={name}
					/>
				)}

				<span className="flex min-w-0 flex-1 flex-col gap-1 py-1 sm:py-2.5">
					<span className="flex min-w-0 items-baseline gap-2">
						{/* Mobile: solo el nombre, cortado a un número fijo de
						    caracteres — el correo de la cuenta no cabe junto a él.
						    El nombre completo ya va en el aria-label del botón. */}
						<strong className="overflow-hidden text-base text-ellipsis whitespace-nowrap sm:hidden">
							{isLoading ? (
								<Skeleton shape="line">{truncateName(name)}</Skeleton>
							) : (
								truncateName(name)
							)}
						</strong>
						<strong className="hidden overflow-hidden text-base text-ellipsis whitespace-nowrap sm:inline">
							{isLoading ? <Skeleton shape="line">{name}</Skeleton> : name}
						</strong>

						<span className="hidden shrink-0 text-[0.7rem] font-semibold text-text-placeholder sm:inline">
							{isLoading ? (
								<Skeleton shape="line">{accountLabel}</Skeleton>
							) : (
								accountLabel
							)}
						</span>
					</span>

					<span className="flex items-center gap-2">
						{/* Puramente visual: el % ya lo anuncia el aria-label del botón
						    y el texto de al lado, así que la barra va aria-hidden. */}
						<span
							className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-surface-hover transition-colors group-hover:bg-surface group-active:bg-surface"
							aria-hidden="true"
						>
							{isLoading ? (
								<Skeleton className="h-full" />
							) : (
								<span
									className="block h-full rounded-sm bg-surface-soft transition-[width] duration-180 ease-in-out"
									style={{ width: `${learningProgress}%` }}
								/>
							)}
						</span>

						<span className="shrink-0 whitespace-nowrap text-[0.72rem] font-semibold text-text-placeholder">
							{isLoading ? (
								<Skeleton shape="line">{progressLabel}</Skeleton>
							) : (
								progressLabel
							)}
						</span>
					</span>
				</span>
			</button>

			{/*
				Badge de racha, estilo "contador de carrito": flota sobre la
				esquina superior derecha del avatar. Es un botón hermano del de
				arriba (no anidado dentro): dos botones dentro de un mismo
				<button> es HTML inválido, así que la posición se calcula con
				`left`/`top` fijos que coinciden con el tamaño del avatar
				(52px en mobile, 64px en sm+) en vez de anidar.
			*/}
			{isLoading ? (
				<Skeleton className={STREAK_BADGE_BOX_CLASS} />
			) : (
				<button
					type="button"
					className={`${STREAK_BADGE_BOX_CLASS} flex cursor-pointer items-center justify-center bg-primary px-1 text-[0.65rem] font-black text-primary-soft transition-transform duration-150 ease-in-out hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]`}
					aria-expanded={isStreakOpen}
					aria-controls="streak-panel"
					aria-label={`Racha, ${streakLabel}. ${isStreakOpen ? "Ocultar calendario" : "Ver calendario"}.`}
					onClick={onToggleStreak}
				>
					{currentStreak}
				</button>
			)}
		</motion.div>
	);
}
