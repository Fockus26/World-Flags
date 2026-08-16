import { type CSSProperties, useId } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTheme } from "@/hooks/useTheme";
import { formatScore } from "@/utils/learning-storage";
import { getScoreBackgroundColor, getScoreColor } from "@/utils/score";

interface ScoreStyle extends CSSProperties {
	"--score-color": string;
	"--score-background": string;
}

interface RegionOptionProps {
	value: string;
	label: string;
	countryCount: number;
	score: number | null;
	defaultChecked: boolean;
}

export function RegionOption({
	value,
	label,
	countryCount,
	score,
	defaultChecked,
}: RegionOptionProps) {
	const tooltipId = useId();
	const { resolvedTheme } = useTheme();
	const isDarkTheme = resolvedTheme === "dark";

	const scoreStyle: ScoreStyle | undefined =
		score !== null
			? {
					"--score-color": getScoreColor(score, isDarkTheme),
					"--score-background": getScoreBackgroundColor(score, isDarkTheme),
				}
			: undefined;

	return (
		<label
			style={scoreStyle}
			className="
				relative
				flex
				min-w-0
				min-h-19
				items-center
				cursor-pointer
				rounded-md
				border
				border-l-4
				border-border-lighter
				border-l-(--score-color)
				bg-(--score-background)
				transition
				duration-200
				ease-in-out
				hover:-translate-y-0.5
				hover:border-(--score-color)
				hover:shadow-md
				has-checked:border-(--score-color)
				has-checked:shadow-[0_0_0_2px_color-mix(in_srgb,var(--score-color)_30%,transparent)]
				has-focus-visible:outline-[3px]
				has-focus-visible:outline-(--color-primary)
				has-focus-visible:outline-offset-2
				max-[30rem]:min-h-16
				max-[43rem]:min-h-[3.9rem]
			"
		>
			<input
				type="radio"
				name="region"
				value={value}
				defaultChecked={defaultChecked}
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
					p-3
					px-3
					[&_button]:rounded-sm
					max-[30rem]:px-2.5
					max-[30rem]:py-2
					max-[43rem]:py-2
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
							text-[0.92rem]
							font-extrabold
							text-(--score-color)
							max-[44rem]:text-[0.82rem]
						"
					>
						{label}
					</span>

					{score !== null && (
						<Tooltip id={tooltipId} label="Promedio de tus últimas 3 partidas">
							<button
								type="button"
								className="
									shrink-0
									rounded-sm
									text-[0.78rem]
									font-black
									text-(--score-color)
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
				</span>

				<span
					className="
						text-[0.72rem]
						font-semibold
						text-text-subtle
					"
				>
					{countryCount} países
				</span>
			</span>
		</label>
	);
}
