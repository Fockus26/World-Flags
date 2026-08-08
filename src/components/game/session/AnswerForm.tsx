import { type SubmitEvent, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AnswerStatus } from "@/types/country";
import styles from "./AnswerForm.module.css";

interface AnswerFormProps {
	countryName: string;
	answer: string;
	onAnswerChange: (value: string) => void;
	answerStatus: AnswerStatus;
	isLastCountry: boolean;
	onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
	onNext: () => void;
}

export function AnswerForm({
	countryName,
	answer,
	onAnswerChange,
	answerStatus,
	isLastCountry,
	onSubmit,
	onNext,
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
		<form className={styles.answerForm} onSubmit={onSubmit}>
			<label htmlFor="country-answer">¿Qué país representa esta bandera?</label>

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

			<div className={styles.feedbackArea}>
				{answerStatus === "correct" && (
					<p className={styles.correctMessage}>
						Correcto: <strong>{countryName}</strong>
					</p>
				)}
				{answerStatus === "incorrect" && (
					<p className={styles.incorrectMessage}>
						La respuesta correcta es <strong>{countryName}</strong>.
					</p>
				)}
			</div>

			{isAnswerChecked ? (
				<Button
					ref={nextButtonRef}
					variant="primary"
					type="button"
					onClick={onNext}
				>
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
