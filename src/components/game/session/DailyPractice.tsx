import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ConfirmationModal } from "@/components/game/session/ConfirmationModal";
import { FlagDisplay } from "@/components/game/session/FlagDisplay";
import { Header } from "@/components/game/session/Header";
import { GradeButtons } from "@/components/ui/GradeButtons";
import { countries } from "@/data/countries";
import { useGame } from "@/hooks/useGame";
import { motionTransition, motionVariants } from "@/styles/animations";
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
	const { gradeCountryReview } = useGame();
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isRevealed, setIsRevealed] = useState(false);
	const [isExitModalOpen, setIsExitModalOpen] = useState(false);

	const currentCode = countryCodes[currentIndex];
	const currentCountry = countries.find((country) => country.code === currentCode);
	const isLast = currentIndex === countryCodes.length - 1;

	function handleGrade(grade: ReviewGrade) {
		if (!currentCode) return;
		gradeCountryReview(currentCode, grade);

		if (isLast) {
			onFinish();
			return;
		}
		setCurrentIndex((value) => value + 1);
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
			<motion.section
				className="flex h-[min(100%,45rem)] md:h-[min(100%, 50rem)] max-h-full w-[min(100%,58rem)] flex-col overflow-hidden rounded-lg border border-border bg-surface p-[0.85rem] shadow-(--shadow-card) min-[44rem]:rounded-2xl min-[44rem]:p-[clamp(1rem,2.5vh,2rem)]"
				variants={motionVariants.contentEnter}
				initial="hidden"
				animate="visible"
			>
				<Header
					regionLabel="Práctica diaria"
					currentIndex={currentIndex}
					totalCountries={countryCodes.length}
					onExit={() => setIsExitModalOpen(true)}
				/>

				<div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-[0.65rem] min-[30rem]:gap-[clamp(0.75rem,2vh,1.5rem)]">
					<FlagDisplay countryCode={currentCountry.code} />

					<motion.div
						className="flex flex-col items-center gap-3"
						layout
						transition={{ layout: motionTransition(0.2) }}
					>
						<AnimatePresence mode="popLayout" initial={false}>
							{!isRevealed ? (
								<motion.button
									key="hint"
									type="button"
									layout
									onClick={() => setIsRevealed(true)}
									className="m-0 cursor-pointer border-0 bg-transparent p-0 text-center text-[0.95rem] text-text-muted"
									variants={motionVariants.feedbackEnter}
									initial="hidden"
									animate="visible"
									exit="exit"
								>
									Presiona{" "}
									<kbd className="hidden rounded-sm border border-border bg-surface-muted px-2 py-[0.15rem] text-[0.85rem] text-text-secondary min-[44rem]:inline">
										Espacio
									</kbd>{" "}
									<span className="min-[44rem]:hidden">Toca aquí</span>
									<span className="hidden min-[44rem]:inline">para revelar</span>
								</motion.button>
							) : (
								<motion.div
									key="answer"
									layout
									className="flex w-full flex-col items-center gap-3"
									variants={motionVariants.answerFeedbackEnter}
									initial="hidden"
									animate="visible"
									exit="exit"
								>
									<p className="m-0 text-center font-extrabold text-[1.4rem] text-text">
										{currentCountry.name}
									</p>
									<GradeButtons onGrade={handleGrade} />
								</motion.div>
							)}
						</AnimatePresence>
					</motion.div>
				</div>
			</motion.section>

			<ConfirmationModal
				isOpen={isExitModalOpen}
				onCancel={() => setIsExitModalOpen(false)}
				onConfirm={onFinish}
			/>
		</>
	);
}
