import { type CSSProperties, useId } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useSelectSound } from "@/hooks/useSelectSound";
import { useTheme } from "@/hooks/useTheme";
import { formatScore } from "@/utils/learning-storage";
import { getScoreBackgroundColor, getScoreColor } from "@/utils/score";

interface ScoreStyle extends CSSProperties {
	"--app-score-color": string;
	"--app-score-background": string;
	"--app-score-active-color": string;
	"--app-score-ring": string;
}

interface RegionOptionProps {
	value: string;
	label: string;
	countryCount: number;
	score: number | null;
	/** Texto del tooltip de la nota; por defecto describe el promedio de un
	 *  continente. "Todo el mundo" no promedia partidas propias (no existen)
	 *  sino los continentes ya practicados, así que necesita su propio texto. */
	scoreTooltipLabel?: string;
	bestTimeLabel?: string | null;
	checked: boolean;
	onChange: () => void;
	/** Texto tipo "Practicado hoy" o "3/45 hoy"; `undefined` para no mostrar nada. */
	practicedLabel?: string;
	/** Reserva el alto de la línea de `practicedLabel` aunque esta tarjeta no
	 *  tenga nada que mostrar todavía (p. ej. un continente sin practicar hoy,
	 *  o "Todo el mundo"), para que todas las tarjetas del grid midan lo mismo
	 *  en vez de saltar de alto según cuál se practicó. */
	showPracticedLine?: boolean;
	/** Carga inicial (D042): skeleton en el hueco de la nota y en la línea de
	 *  `practicedLabel`, sin cambiar el alto de la tarjeta. El nombre y el
	 *  número de países no dependen del progreso y se muestran igual. */
	isLoading?: boolean;
	className?: string;
}

/** Referencia invisible para el ancho del skeleton de la nota (D038). */
const SCORE_SIZING_SAMPLE = `${formatScore(10)}/10`;

export function RegionOption({
	value,
	label,
	countryCount,
	score,
	scoreTooltipLabel = "Promedio de tus últimas 3 partidas",
	bestTimeLabel,
	checked,
	onChange,
	practicedLabel,
	showPracticedLine,
	isLoading,
	className,
}: RegionOptionProps) {
	const tooltipId = useId();
	const { resolvedTheme } = useTheme();
	const isDarkTheme = resolvedTheme === "dark";
	// Marcar o desmarcar la tarjeta suena el "tic" de selección (D143).
	const withSelectSound = useSelectSound();

	const scoreStyle: ScoreStyle = {
		"--app-score-color":
			score !== null
				? getScoreColor(score, isDarkTheme)
				: "var(--color-neutral-hover)",

		"--app-score-background":
			score !== null
				? getScoreBackgroundColor(score, isDarkTheme)
				: "var(--color-neutral-soft)",

		"--app-score-active-color":
			score !== null ? "var(--app-score-color)" : "var(--color-neutral)",

		// Anillo de foco del color de la tarjeta (D102). El color de la nota
		// crudo da 1,97–2,35:1 sobre claro en notas medias/altas (falla el
		// 3:1 de un anillo), así que se mezcla hacia `--foreground` igual que
		// el texto de `Button` (`readableFg`): ≥4,2:1 en claro y ≥6,5:1 en
		// oscuro para las 10 notas.
		"--app-score-ring":
			"color-mix(in oklab, var(--app-score-color) 62%, var(--foreground))",
	};

	return (
		<label
			style={scoreStyle}
			className={`
	relative flex min-h-16 min-w-0 touch-manipulation cursor-pointer items-center rounded-md border-2 border-l-4
	border-(--app-score-color)
	text-surface-soft
	hover:bg-(--app-score-background)
	has-focus-visible:bg-(--app-score-background)
	has-checked:bg-(--app-score-background)
	has-checked:[&_.region-check]:border-(--app-score-color)
	has-checked:[&_.region-check]:bg-(--app-score-color)
	transition duration-200 ease-in-out
	hover:-translate-y-0.5
	has-focus-visible:-translate-y-0.5
	active:translate-y-0
	active:scale-[0.98]
	hover:shadow-[0_0_0_2px_var(--app-score-color)]
	has-focus-visible:shadow-[0_0_0_2px_var(--app-score-color)]
	has-checked:shadow-[0_0_0_2px_var(--app-score-color)]
	outline-(--app-score-ring)
	has-focus-visible:outline-[3px]
	has-focus-visible:outline-offset-3
	min-[44rem]:min-h-19
	${className ?? ""}
`}
		>
			<input
				type="checkbox"
				name="region"
				value={value}
				tabIndex={0}
				checked={checked}
				onChange={withSelectSound(onChange)}
				// Cubre la tarjeta entera (sigue invisible y sin eventos): al
				// tabular dentro de la sección con scroll, el navegador trae a la
				// vista el input enfocado, no el <label>. Con 1px en el centro, la
				// tarjeta — y su anillo de foco — quedaba medio cortada al subir con
				// Shift+Tab. `scroll-m-2` deja sitio para el `outline-offset-3`.
				className="
					pointer-events-none
					absolute
					inset-0
					size-full
					scroll-m-2
					opacity-0
				"
			/>

			<span
				className="
					flex
					w-full
					min-w-0
					flex-col
					gap-1
					px-2.5
					py-2
					[&_button]:rounded-sm
					min-[44rem]:p-3
					min-[44rem]:px-3
				"
			>
				<span
					className="
						flex
						min-w-0
						items-center
						justify-between
						gap-2
					"
				>
					<span
						className="
							min-w-0
							overflow-hidden
							text-ellipsis
							whitespace-nowrap
							text-[0.82rem]
							font-extrabold
							min-[44rem]:text-[0.92rem]
						"
					>
						{label}
					</span>

					<span className="flex shrink-0 items-center gap-1.5">
						{isLoading && (
							<Skeleton shape="line" className="text-xs font-black">
								{SCORE_SIZING_SAMPLE}
							</Skeleton>
						)}

						{!isLoading && score !== null && (
							<Tooltip id={tooltipId} label={scoreTooltipLabel}>
								<button
									type="button"
									className="
										shrink-0
										rounded-sm
										text-xs
										font-black
										transition-transform
										duration-200
										hover:scale-105
									"
									aria-describedby={tooltipId}
								>
									{formatScore(score)}/10
								</button>
							</Tooltip>
						)}

						<span
							aria-hidden="true"
							className="
								region-check
								flex
								size-4
								shrink-0
								items-center
								justify-center
								rounded-sm
								border-2
								border-(--app-score-color)/35
								bg-transparent
								transition-colors
								duration-200
							"
						/>
					</span>
				</span>

				<span
					className="
						flex
						min-w-0
						items-center
						justify-between
						gap-2
						text-[0.72rem]
						font-semibold
					"
				>
					<span>{countryCount} países</span>
					{bestTimeLabel && (
						<span className="font-black">⏱ {bestTimeLabel}</span>
					)}
				</span>

				{showPracticedLine && (
					<span
						className="text-surface-soft text-[0.68rem] font-bold"
						aria-hidden={!practicedLabel || undefined}
					>
						{isLoading ? (
							<Skeleton shape="line" className="w-16">
								{" "}
							</Skeleton>
						) : (
							(practicedLabel ?? " ")
						)}
					</span>
				)}
			</span>
		</label>
	);
}
