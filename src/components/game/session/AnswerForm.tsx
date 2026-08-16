import { AnimatePresence, motion } from "framer-motion";
import { type SubmitEvent, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { GradeButtons } from "@/components/ui/GradeButtons";
import { Input } from "@/components/ui/Input";
import { motionVariants } from "@/styles/animations";
import type { AnswerStatus, GameMode } from "@/types/country";
import type { ReviewGrade } from "@/types/progress";

interface AnswerFormProps {
	countryName: string;
	answer: string;
	onAnswerChange: (value: string) => void;
	answerStatus: AnswerStatus;
	isLastCountry: boolean;
	onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
	onNext: () => void;
	mode: GameMode;
	onGrade: (grade: ReviewGrade) => void;
}

export function AnswerForm({
	countryName,
	answer,
	onAnswerChange,
	answerStatus,
	isLastCountry,
	onSubmit,
	onNext,
	mode,
	onGrade,
}: AnswerFormProps) {
	const isAnswerChecked = answerStatus !== "idle";
	const inputRef = useRef<HTMLInputElement>(null);
	const nextButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (answerStatus === "idle") {
			inputRef.current?.focus();
			return;
		}
		nextButtonRef.current?.focus();
	}, [answerStatus]);

	return (
		<form className="grid shrink-0 gap-[0.65rem] max-[43rem]:gap-[0.45rem]" onSubmit={onSubmit}>
			<label htmlFor="country-answer" className="font-extrabold text-text-secondary">
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

			<AnimatePresence mode="popLayout">
				{answerStatus === "correct" && (
					<motion.p
						key="correct"
						className="m-0 rounded-md border border-success-border bg-success-bg px-3.5 py-3 text-[0.9rem] text-success"
						variants={motionVariants.answerFeedbackEnter}
						initial="hidden"
						animate="visible"
						exit="hidden"
					>
						Correcto: <strong>{countryName}</strong>
					</motion.p>
				)}

				{answerStatus === "incorrect" && (
					<motion.p
						key="incorrect"
						className="m-0 rounded-md border border-danger-border bg-danger-bg px-3.5 py-3 text-[0.9rem] text-danger-text"
						variants={motionVariants.answerFeedbackEnter}
						initial="hidden"
						animate="visible"
						exit="hidden"
					>
						La respuesta correcta es <strong>{countryName}</strong>.
					</motion.p>
				)}
			</AnimatePresence>

			{isAnswerChecked && mode === "practice" ? (
				<motion.div
					variants={motionVariants.answerFeedbackEnter}
					initial="hidden"
					animate="visible"
				>
					<GradeButtons onGrade={onGrade} />
				</motion.div>
			) : isAnswerChecked ? (
				<Button ref={nextButtonRef} variant="primary" type="button" onClick={onNext}>
					{isLastCountry ? "Ver resultado" : "Siguiente bandera"}
				</Button>
			) : (
				<Button variant="primary" type="submit" disabled={!answer.trim()}>
					Comprobar
				</Button>
			)}
		</form>
	);
}
