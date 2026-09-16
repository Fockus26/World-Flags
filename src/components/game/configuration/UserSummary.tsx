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
	className?: string;
}

const MOBILE_NAME_MAX_CHARS = 15;

/** Por caracteres reales (no unidades UTF-16), para no partir un emoji a la mitad. */
function truncateName(name: string): string {
	const characters = [...name];
	return characters.length > MOBILE_NAME_MAX_CHARS
		? `${characters.slice(0, MOBILE_NAME_MAX_CHARS).join("")}…`
		: name;
}

export function UserSummary({
	name,
	avatarUrl,
	accountLabel,
	learningProgress,
	learnedCountries,
	totalCountries,
	onOpenModal,
	className,
}: UserSummaryProps) {
	return (
		<motion.button
			type="button"
			className={`group flex w-full touch-manipulation cursor-pointer items-center gap-3 rounded-full bg-surface pr-4 text-left text-surface-soft transition-[background-color,transform] duration-180 ease-in-out hover:bg-surface-hover active:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-surface-soft ${className ?? ""}`}
			variants={motionVariants.contentEnter}
			initial={false}
			animate="visible"
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
					{/* Mobile: solo el nombre, cortado a un número fijo de
					    caracteres — el correo de la cuenta no cabe junto a él.
					    El nombre completo ya va en el aria-label del botón. */}
					<strong className="overflow-hidden text-base text-ellipsis whitespace-nowrap sm:hidden">
						{truncateName(name)}
					</strong>
					<strong className="hidden overflow-hidden text-base text-ellipsis whitespace-nowrap sm:inline">
						{name}
					</strong>

					<span className="hidden shrink-0 text-[0.7rem] font-semibold text-text-placeholder sm:inline">
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
		</motion.button>
	);
}
