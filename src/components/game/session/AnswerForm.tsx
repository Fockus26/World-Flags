import { AnimatePresence, motion } from "framer-motion";
import {
	type ReactNode,
	type RefObject,
	type SubmitEvent,
	useEffect,
	useRef,
} from "react";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { GradeButtons } from "@/components/ui/GradeButtons";
import { Input } from "@/components/ui/Input";
import { motionTransition, motionVariants } from "@/styles/animations";
import type { AnswerStatus, GameMode } from "@/types/country";
import type { ReviewGrade } from "@/types/progress";
import { focusWhenVisible } from "@/utils/focus";

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
	/** Personalizan la pregunta y el placeholder — por defecto los de Banderas, así `Session` no cambia. */
	label?: string;
	placeholder?: string;
	/** Se añade tras el nombre en el aviso de acierto (p. ej. " con 2 pistas" en la práctica de Países). */
	correctSuffix?: ReactNode;
	/** Expone el input real al padre — lo necesita el modo Países como origen de la animación de "vuelo" hacia el tablero. */
	inputRef?: RefObject<HTMLInputElement | null>;
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
	label = "¿Qué país representa esta bandera?",
	placeholder = "Escribe el nombre del país",
	correctSuffix,
	inputRef,
}: AnswerFormProps) {
	const isAnswerChecked = answerStatus !== "idle";
	const internalInputRef = useRef<HTMLInputElement>(null);
	const resolvedInputRef = inputRef ?? internalInputRef;

	useEffect(() => {
		if (answerStatus === "idle") {
			focusWhenVisible(resolvedInputRef.current);
		}
	}, [answerStatus, resolvedInputRef]);

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
				{label}
			</label>

			<Input
				ref={resolvedInputRef}
				id="country-answer"
				name="answer"
				type="text"
				value={answer}
				onChange={(event) => onAnswerChange(event.target.value)}
				disabled={isAnswerChecked}
				autoComplete="off"
				spellCheck={false}
				placeholder={placeholder}
			/>

			<AnimatePresence mode="popLayout" initial={false}>
				{answerStatus === "correct" && (
					<FeedbackMessage key="correct" variant="success" role="status">
						Correcto: <strong className="text-inherit">{countryName}</strong>
						{correctSuffix}
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
