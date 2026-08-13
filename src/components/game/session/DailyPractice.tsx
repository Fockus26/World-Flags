import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ConfirmationModal } from "@/components/game/session/ConfirmationModal";
import { FlagDisplay } from "@/components/game/session/FlagDisplay";
import { Header } from "@/components/game/session/Header";
import { countries } from "@/data/countries";
import { useGame } from "@/hooks/useGame";
import { motionVariants } from "@/styles/animations";
import type { ReviewGrade } from "@/types/progress";
import { GradeButtons } from "../../ui/GradeButtons";

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
			if (grade) handleGrade(grade);
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
				className="flex w-full flex-col items-center gap-6"
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

				<div className="flex w-full flex-col items-center gap-5">
					<FlagDisplay countryCode={currentCountry.code} />

					<AnimatePresence mode="wait">
						{!isRevealed ? (
							<motion.p
								key="hint"
								className="text-center text-[0.95rem] text-text-muted"
								variants={motionVariants.feedbackEnter}
								initial="hidden"
								animate="visible"
								exit="hidden"
							>
								Presiona{" "}
								<kbd className="rounded-sm border border-border bg-surface-muted px-2 py-[0.15rem] text-[0.85rem]">
									Espacio
								</kbd>{" "}
								para revelar
							</motion.p>
						) : (
							<motion.div
								key="answer"
								variants={motionVariants.answerFeedbackEnter}
								initial="hidden"
								animate="visible"
								exit="hidden"
							>
								<p className="mb-4 text-center text-[1.4rem] font-extrabold text-text">
									{currentCountry.name}
								</p>
								<GradeButtons onGrade={handleGrade} />
							</motion.div>
						)}
					</AnimatePresence>
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
