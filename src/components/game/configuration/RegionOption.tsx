import { type CSSProperties, useId } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useTheme } from "@/hooks/useTheme";
import { formatScore } from "@/utils/learning-storage";
import { getScoreBackgroundColor, getScoreColor } from "@/utils/score";
import styles from "./RegionOption.module.css";

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
		<label className={styles.option} style={scoreStyle}>
			<input type="radio" name="region" value={value} defaultChecked={defaultChecked} />

			<span className={styles.optionContent}>
				<span className={styles.optionTop}>
					<span className={styles.optionName}>{label}</span>

					{score !== null && (
						<Tooltip id={tooltipId} label="Promedio de tus últimas 3 partidas">
							<button
								type="button"
								className={styles.optionScoreValue}
								aria-describedby={tooltipId}
							>
								{formatScore(score)}/10
							</button>
						</Tooltip>
					)}
				</span>

				<span className={styles.optionMeta}>{countryCount} países</span>
			</span>
		</label>
	);
}
