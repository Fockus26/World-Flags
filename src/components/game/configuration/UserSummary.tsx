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
			className="flex w-full cursor-pointer items-center gap-3.5 rounded-md border border-border-lighter bg-surface px-3.5 py-2.5 text-left text-text transition-[background-color,border-color,box-shadow,transform] duration-180 ease-in-out hover:bg-surface-secondary  hover:border-border hover:shadow-(--shadow-secondary) focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-border-lighter"
			variants={motionVariants.contentEnter}
			initial="hidden"
			animate="visible"
			aria-label={`${name}, progreso ${learningProgress} por ciento. Abrir perfil y configuración.`}
			onClick={onOpenModal}
		>
			<img
				className="size-12 shrink-0 rounded-md object-cover"
				src={avatarUrl}
				alt=""
				aria-hidden="true"
			/>

			<span className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="flex min-w-0 items-baseline gap-2">
					<strong className="overflow-hidden text-4 text-ellipsis whitespace-nowrap">
						{name}
					</strong>

					<span className="shrink-0 text-[0.7rem] font-semibold text-text-subtle">
						{accountLabel}
					</span>
				</span>

				<span className="flex items-center gap-2">
					<span
						className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-border-lighter"
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={learningProgress}
					>
						<span
							className="block h-full rounded-sm bg-text transition-[width] duration-180 ease-in-out"
							style={{ width: `${learningProgress}%` }}
						/>
					</span>

					<span className="shrink-0 whitespace-nowrap text-[0.72rem] font-semibold text-text-subtle">
						{learningProgress}% · {learnedCountries}/{totalCountries}
					</span>
				</span>
			</span>
		</motion.button>
	);
}
