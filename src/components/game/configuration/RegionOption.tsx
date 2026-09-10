import { type CSSProperties, useId } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTheme } from "@/hooks/useTheme";
import { formatScore } from "@/utils/learning-storage";
import { getScoreBackgroundColor, getScoreColor } from "@/utils/score";

interface ScoreStyle extends CSSProperties {
	"--app-score-color": string;
	"--app-score-background": string;
	"--app-score-active-color": string;
}

interface RegionOptionProps {
	value: string;
	label: string;
	countryCount: number;
	score: number | null;
	bestTimeLabel?: string | null;
	checked: boolean;
	onChange: () => void;
	/** Texto tipo "Practicado hoy" o "3/45 hoy"; `undefined` para no mostrar nada. */
	practicedLabel?: string;
	className?: string;
}

export function RegionOption({
	value,
	label,
	countryCount,
	score,
	bestTimeLabel,
	checked,
	onChange,
	practicedLabel,
	className,
}: RegionOptionProps) {
	const tooltipId = useId();
	const { resolvedTheme } = useTheme();
	const isDarkTheme = resolvedTheme === "dark";

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
	};

	return (
		<label
			style={scoreStyle}
			className={`
	relative flex min-h-16 min-w-0 touch-manipulation cursor-pointer items-center rounded-md border border-l-4
	border-(--app-score-color)
	text-surface-soft
	hover:bg-(--app-score-background)
	active:bg-(--app-score-background)
	has-checked:bg-(--app-score-background)
	has-checked:border-primary
	has-checked:[&_.region-check]:border-(--app-score-color)
	has-checked:[&_.region-check]:bg-(--app-score-color)
	transition duration-200 ease-in-out
	hover:-translate-y-0.5
	active:translate-y-0
	active:scale-[0.98]
	hover:shadow-[0_0_0_2px_color-mix(in_srgb,var(--app-score-color)_35%,transparent)]
	active:shadow-[0_0_0_2px_color-mix(in_srgb,var(--app-score-color)_35%,transparent)]
	has-checked:shadow-[0_0_0_2px_var(--color-primary)]
	outline-[var(--focus)]
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
				onChange={onChange}
				className="
					pointer-events-none
					absolute
					size-px
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
						{score !== null && (
							<Tooltip
								id={tooltipId}
								label="Promedio de tus últimas 3 partidas"
							>
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

				{practicedLabel && (
					<span className="text-surface-soft text-[0.68rem] font-bold">
						{practicedLabel}
					</span>
				)}
			</span>
		</label>
	);
}
