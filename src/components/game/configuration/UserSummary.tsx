import { motion } from "framer-motion";
import { motionVariants } from "@/styles/animations";

interface UserSummaryProps {
	name: string;
	avatarUrl: string;
	accountLabel: string;
	learningProgress: number;
	learnedCountries: number;
	totalCountries: number;
	onOpenModal: () => void;
}

export function UserSummary({
	name,
	avatarUrl,
	accountLabel,
	learningProgress,
	learnedCountries,
	totalCountries,
	onOpenModal,
}: UserSummaryProps) {
	return (
		<motion.button
			type="button"
			className="group flex w-full touch-manipulation cursor-pointer items-center gap-3.5 rounded-md bg-surface text-left text-surface-soft transition-[background-color,transform] duration-180 ease-in-out hover:bg-surface-hover active:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-surface-soft"
			variants={motionVariants.contentEnter}
			initial="hidden"
			animate="visible"
			aria-label={`${name}, progreso ${learningProgress} por ciento. Abrir perfil y configuración.`}
			onClick={onOpenModal}
		>
			<img
				className="size-13 sm:size-16 shrink-0 rounded-md object-cover"
				src={avatarUrl}
				alt=""
				aria-hidden="true"
			/>

			<span className="flex min-w-0 flex-1 flex-col gap-1  pr-3.5 py-1 sm:py-2.5">
				<span className="flex min-w-0 items-baseline gap-2">
					<strong className="overflow-hidden text-4 text-ellipsis whitespace-nowrap">
						{name}
					</strong>

					<span className="shrink-0 text-[0.7rem] font-semibold text-text-placeholder">
						{accountLabel}
					</span>
				</span>

				<span className="flex items-center gap-2">
					<span
						className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-surface-hover transition-colors group-hover:bg-surface group-active:bg-surface"
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={learningProgress}
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
		</motion.button>
	);
}
