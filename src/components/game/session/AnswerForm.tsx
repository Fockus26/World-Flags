import { AnimatePresence, motion } from "framer-motion";
import { type SubmitEvent, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { GradeButtons } from "@/components/ui/GradeButtons";
import { Input } from "@/components/ui/Input";
import { motionTransition, motionVariants } from "@/styles/animations";
import type { AnswerStatus, GameMode } from "@/types/country";
import type { ReviewGrade } from "@/types/progress";

interface AnswerFormProps {
	countryName: string;
	answer: string;
	onAnswerChange: (value: string) => void;
	answerStatus: AnswerStatus;
	onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
	onSkip: () => void;
	mode: GameMode;
	onGrade: (grade: ReviewGrade) => void;
}

export function AnswerForm({
	countryName,
	answer,
	onAnswerChange,
	answerStatus,
	onSubmit,
	onSkip,
	mode,
	onGrade,
}: AnswerFormProps) {
	const isAnswerChecked = answerStatus !== "idle";
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (answerStatus === "idle") {
			inputRef.current?.focus();
		}
	}, [answerStatus]);

	return (
		<motion.form
			className="grid shrink-0 gap-[0.45rem] min-[43rem]:gap-[0.65rem]"
			layout
			transition={{ layout: motionTransition(0.2) }}
			onSubmit={onSubmit}
		>
			<label htmlFor="country-answer" className="font-extrabold text-surface-soft">
				¿Qué país representa esta bandera?
			</label>

			<Input
				ref={inputRef}
				id="country-answer"
				name="answer"
				type="text"
				value={answer}
				onChange={(event) => onAnswerChange(event.target.value)}
				disabled={isAnswerChecked}
				autoComplete="off"
				spellCheck={false}
				placeholder="Escribe el nombre del país"
			/>

			<AnimatePresence mode="popLayout" initial={false}>
				{answerStatus === "correct" && (
					<FeedbackMessage key="correct" variant="success">
						Correcto: <strong className="text-inherit">{countryName}</strong>
					</FeedbackMessage>
				)}

				{answerStatus === "incorrect" && (
					<FeedbackMessage key="incorrect" variant="danger">
						La respuesta correcta es <strong>{countryName}</strong>.
					</FeedbackMessage>
				)}
			</AnimatePresence>

			{isAnswerChecked && mode === "practice" && (
				<motion.div
					variants={motionVariants.answerFeedbackEnter}
					initial="hidden"
					animate="visible"
				>
					<GradeButtons onGrade={onGrade} />
				</motion.div>
			)}

			{!isAnswerChecked && (
				<div className="flex gap-2">
					<Button type="submit" disabled={!answer.trim()} className="flex-1">
						Comprobar
					</Button>
					<Button type="button" variant="outline" color="neutral" onClick={onSkip}>
						Skip
					</Button>
				</div>
			)}
		</motion.form>
	);
}
