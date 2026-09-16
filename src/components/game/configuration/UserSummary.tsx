import { motion } from "framer-motion";
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
	className?: string;
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
	className,
}: UserSummaryProps) {
	const currentStreak = getCurrentStreak(activeDays);
	const streakLabel =
		currentStreak === 1 ? "1 día seguido" : `${currentStreak} días seguidos`;

	return (
		<motion.div
			className={`relative flex w-full items-center ${className ?? ""}`}
			variants={motionVariants.contentEnter}
			initial={false}
			animate="visible"
		>
			<button
				type="button"
				className="group flex w-full touch-manipulation cursor-pointer items-center gap-3 rounded-full bg-surface pr-4 text-left text-surface-soft transition-[background-color,transform] duration-180 ease-in-out hover:bg-surface-hover active:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-surface-soft"
				aria-label={`${name}, progreso ${learningProgress} por ciento. Abrir perfil y configuración.`}
				onClick={onOpenModal}
			>
				<img
					className="size-13 sm:size-16 shrink-0 rounded-full object-cover"
					src={avatarUrl}
					alt=""
					aria-hidden="true"
				/>

				<span className="flex min-w-0 flex-1 flex-col gap-1 py-1 sm:py-2.5">
					<span className="flex min-w-0 items-baseline gap-2">
						<strong className="overflow-hidden text-base text-ellipsis whitespace-nowrap">
							{name}
						</strong>

						<span className="shrink-0 text-[0.7rem] font-semibold text-text-placeholder">
							{accountLabel}
						</span>
					</span>

					<span className="flex items-center gap-2">
						{/* Puramente visual: el % ya lo anuncia el aria-label del botón
						    y el texto de al lado, así que la barra va aria-hidden. */}
						<span
							className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-surface-hover transition-colors group-hover:bg-surface group-active:bg-surface"
							aria-hidden="true"
						>
							<span
								className="block h-full rounded-sm bg-surface-soft transition-[width] duration-180 ease-in-out"
								style={{ width: `${learningProgress}%` }}
							/>
						</span>

						<span className="shrink-0 whitespace-nowrap text-[0.72rem] font-semibold text-text-placeholder">
							{learningProgress}% · {learnedCountries}/{totalCountries}
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
			<button
				type="button"
				className="absolute left-8 -top-1.5 sm:left-11 z-10 flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-full border-2 border-surface bg-primary px-1 text-[0.65rem] font-black text-primary-soft transition-transform duration-150 ease-in-out hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
				aria-expanded={isStreakOpen}
				aria-controls="streak-panel"
				aria-label={`Racha, ${streakLabel}. ${isStreakOpen ? "Ocultar calendario" : "Ver calendario"}.`}
				onClick={onToggleStreak}
			>
				{currentStreak}
			</button>
		</motion.div>
	);
}
