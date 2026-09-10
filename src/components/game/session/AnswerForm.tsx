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
	/** Tras un skip en práctica "otra vez" ya quedó decidido: no hace falta elegir. */
	hideGradeButtons?: boolean;
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
	hideGradeButtons,
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
			<label
				htmlFor="country-answer"
				className="font-extrabold text-surface-soft"
			>
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
					<FeedbackMessage key="correct" variant="success" role="status">
						Correcto: <strong className="text-inherit">{countryName}</strong>
					</FeedbackMessage>
				)}

				{answerStatus === "incorrect" && (
					<FeedbackMessage key="incorrect" variant="danger" role="alert">
						La respuesta correcta es <strong>{countryName}</strong>
					</FeedbackMessage>
				)}
			</AnimatePresence>

			{isAnswerChecked && mode === "practice" && !hideGradeButtons && (
				<motion.div
					variants={motionVariants.answerFeedbackEnter}
					initial={false}
					animate="visible"
				>
					<GradeButtons onGrade={onGrade} />
				</motion.div>
			)}

			{!isAnswerChecked && (
				<div className="grid grid-cols-[2fr_1fr] gap-2">
					<Button type="submit" disabled={!answer.trim()}>
						Comprobar
					</Button>
					<Button
						type="button"
						variant="outline"
						color="neutral"
						onClick={onSkip}
					>
						Saltar
					</Button>
				</div>
			)}
		</motion.form>
	);
}
