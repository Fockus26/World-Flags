import {
	useState,
	type CSSProperties,
	type FormEvent,
} from "react";

import {
	REGION_LABELS,
	REGIONS,
	type GameConfiguration as GameConfigurationType,
	type PracticeOrder,
	type PracticeRegion,
} from "../../types/country";
import {
	getScoreBackgroundColor,
	getScoreColor,
} from "../../utils/score";
    import type {
	UserLearningData,
	UserProfile,
} from "../../types/progress";

import {
	calculateLearningProgress,
	calculateRegionAverage,
	countLearnedCountries,
	formatScore,
} from "../../utils/learning-storage";

import { UserProfileEditor } from "./UserProfileEditor";

import styles from "./FlagGame.module.css";

interface GameConfigurationProps {
	learningData: UserLearningData;
	onProfileSave: (profile: UserProfile) => void;
	onStart: (configuration: GameConfigurationType) => void;
}

interface ScoreStyle extends CSSProperties {
	"--score-color": string;
	"--score-background": string;
}

export function GameConfiguration({
	learningData,
	onProfileSave,
	onStart,
}: GameConfigurationProps) {
    const [isProfileEditorOpen, setIsProfileEditorOpen] =
	useState(false);

const learnedCountries = countLearnedCountries(
	learningData.countryHistory,
);

const learningProgress = calculateLearningProgress(
	learningData.countryHistory,
	196,
);

const avatarUrl =
	`https://api.dicebear.com/9.x/` +
	`${learningData.profile.avatarStyle}/svg` +
	`?seed=${encodeURIComponent(
		learningData.profile.avatarSeed,
	)}`;

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);

		const region = formData.get(
			"region",
		) as PracticeRegion;

		const order = formData.get(
			"order",
		) as PracticeOrder;

		onStart({
			region,
			order,
		});
	}

	return (
        <>
		<section className={styles.configuration}>
            <div className={styles.userSummary}>
	<button
		className={styles.profileButton}
		type="button"
		onClick={() => setIsProfileEditorOpen(true)}
	>
		<img
			className={styles.profileAvatar}
			src={avatarUrl}
			alt={`Avatar de ${learningData.profile.name}`}
		/>

		<span className={styles.profileText}>
			<strong>{learningData.profile.name}</strong>
			<small>Editar perfil</small>
		</span>
	</button>

	<div className={styles.globalProgress}>
		<div className={styles.globalProgressHeader}>
			<span>Progreso global</span>
			<strong>{learningProgress}%</strong>
		</div>

		<div
			className={styles.globalProgressBar}
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={learningProgress}
		>
			<div
				className={styles.globalProgressValue}
				style={{
					width: `${learningProgress}%`,
				}}
			/>
		</div>

		<small>
			{learnedCountries} de 196 países aprendidos
		</small>
	</div>
</div>

			<header className={styles.header}>
				<p className={styles.eyebrow}>
					Entrenamiento de geografía
				</p>

				<h1>Aprende las banderas del mundo</h1>

				<p>
					Selecciona una región y el orden de las
					banderas.
				</p>
			</header>

			<form
				className={styles.configurationForm}
				onSubmit={handleSubmit}
			>
				<fieldset className={styles.fieldset}>
					<legend>Países</legend>

					<div className={styles.regionGrid}>
						<label className={styles.option}>
							<input
								type="radio"
								name="region"
								value="world"
								defaultChecked
							/>

							<span className={styles.optionContent}>
								<span>Todo el mundo</span>

								<span className={styles.countryCount}>
									196
								</span>
							</span>
						</label>

						{REGIONS.map((region) => {
							const recentScores =
	learningData.regionGameScores[region];

const score = calculateRegionAverage(recentScores);

							const scoreStyle: ScoreStyle | undefined =
								score !== null
									? {
											"--score-color":
												getScoreColor(score),
											"--score-background":
												getScoreBackgroundColor(
													score,
												),
										}
									: undefined;

							return (
								<label
									className={styles.option}
									key={region}
								>
									<input
										type="radio"
										name="region"
										value={region}
									/>

									<span
										className={styles.optionContent}
									>
										<span>
											{REGION_LABELS[region]}
										</span>

										{score !== null ? (
											<span
	className={styles.regionScore}
	style={scoreStyle}
	tabIndex={0}
	aria-label="Promedio de las últimas tres partidas completadas"
>
	{formatScore(score)}/10

	<span
		className={styles.scoreTooltip}
		role="tooltip"
	>
		Promedio de tus últimas 3 partidas
	</span>
</span>
										) : (
											<span
												className={
													styles.notPracticed
												}
											>
												Sin nota
											</span>
										)}
									</span>
								</label>
							);
						})}
					</div>
				</fieldset>

				<fieldset className={styles.fieldset}>
					<legend>Orden</legend>

					<div className={styles.orderGrid}>
						<label className={styles.option}>
							<input
								type="radio"
								name="order"
								value="alphabetical"
								defaultChecked
							/>

							<span className={styles.optionContent}>
								<span>Alfabético</span>
							</span>
						</label>

						<label className={styles.option}>
							<input
								type="radio"
								name="order"
								value="random"
							/>

							<span className={styles.optionContent}>
								<span>Aleatorio</span>
							</span>
						</label>
					</div>
				</fieldset>

				<button
					className={styles.primaryButton}
					type="submit"
				>
					Comenzar práctica
				</button>
			</form>
		</section>
        {isProfileEditorOpen && (
            <UserProfileEditor
                profile={learningData.profile}
                onClose={() => setIsProfileEditorOpen(false)}
                onSave={(profile) => {
                    onProfileSave(profile);
                    setIsProfileEditorOpen(false);
                }}
            />
        )}
</>
	);
}