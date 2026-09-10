import { useEffect, useState } from "react";
import { ConfirmationModal } from "@/components/game/session/ConfirmationModal";
import { FlagDisplay } from "@/components/game/session/FlagDisplay";
import { Header } from "@/components/game/session/Header";
import { GradeButtons } from "@/components/ui/GradeButtons";
import { countries } from "@/data/countries";
import { useGame } from "@/hooks/useGame";
import { usePracticeQueue } from "@/hooks/usePracticeQueue";
import type { ReviewGrade } from "@/types/progress";

interface DailyPracticeProps {
	countryCodes: string[];
	onFinish: () => void;
}

const GRADE_BY_KEY: Record<string, ReviewGrade> = {
	"1": "again",
	"2": "hard",
	"3": "good",
	"4": "easy",
};

export function DailyPractice({ countryCodes, onFinish }: DailyPracticeProps) {
	const { learningData, gradeCountryReview } = useGame();
	const [isRevealed, setIsRevealed] = useState(false);
	const [isExitModalOpen, setIsExitModalOpen] = useState(false);

	const { currentCode, totalCount, completedCount, grade } = usePracticeQueue({
		initialCodes: countryCodes,
		countryHistory: learningData.countryHistory,
		onGrade: (code, gradeValue, isFirstAttempt) =>
			gradeCountryReview(code, gradeValue, isFirstAttempt),
		onFinish,
	});

	const currentCountry = countries.find(
		(country) => country.code === currentCode,
	);

	function handleGrade(gradeValue: ReviewGrade) {
		grade(gradeValue);
		setIsRevealed(false);
	}

	useEffect(() => {
		if (isExitModalOpen) return;

		function handleKeyDown(event: KeyboardEvent) {
			if (!isRevealed) {
				if (event.code === "Space" || event.key === "Enter") {
					event.preventDefault();
					setIsRevealed(true);
				}
				return;
			}
			const grade = GRADE_BY_KEY[event.key];
			if (grade) {
				event.preventDefault();
				handleGrade(grade);
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
		// biome-ignore lint/correctness/useExhaustiveDependencies: handleGrade estabilizado por React Compiler (ver docs/components.md)
	}, [isRevealed, isExitModalOpen, handleGrade]);

	if (!currentCode || !currentCountry) {
		return null;
	}

	return (
		<>
			<section className="flex h-[min(100%,45rem)] md:h-[min(100%,50rem)] max-h-full w-[min(100%,58rem)] flex-col overflow-hidden rounded-lg border border-surface-border bg-surface p-[0.85rem] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 min-[44rem]:rounded-2xl min-[44rem]:p-[clamp(1rem,2.5vh,2rem)]">
				<Header
					regionLabel="Práctica diaria"
					currentIndex={completedCount}
					totalCountries={totalCount}
					onExit={() => setIsExitModalOpen(true)}
				/>

				<div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-[0.65rem] min-[30rem]:gap-[clamp(0.75rem,2vh,1.5rem)]">
					<FlagDisplay countryCode={currentCountry.code} />

					<div className="flex flex-col items-center gap-3">
						{!isRevealed ? (
							<button
								type="button"
								onClick={() => setIsRevealed(true)}
								className="m-0 cursor-pointer border-0 bg-transparent p-0 text-center text-[0.95rem] text-text-placeholder animate-in fade-in-0 duration-150"
							>
								Presiona{" "}
								<kbd className="hidden rounded-sm border border-surface-border bg-surface-soft px-2 py-[0.15rem] text-[0.85rem] text-secondary-soft min-[44rem]:inline">
									Espacio
								</kbd>{" "}
								<span className="min-[44rem]:hidden">Toca aquí</span>
								<span className="hidden min-[44rem]:inline">para revelar</span>
							</button>
						) : (
							<div className="flex w-full flex-col items-center gap-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
								<p className="m-0 text-center font-extrabold text-[1.4rem] text-surface-soft">
									{currentCountry.name}
								</p>
								<GradeButtons onGrade={handleGrade} />
							</div>
						)}
					</div>
				</div>
			</section>

			<ConfirmationModal
				isOpen={isExitModalOpen}
				onCancel={() => setIsExitModalOpen(false)}
				onConfirm={onFinish}
			/>
		</>
	);
}
