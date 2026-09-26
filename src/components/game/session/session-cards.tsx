import type { ReactNode } from "react";
import type {
	AnswerStatus,
	Country,
	Difficulty,
	GameType,
} from "@/types/country";
import {
	getAcceptedCapitals,
	getCapital,
	isCorrectCapital,
} from "@/utils/capitals";
import { isCorrectAnswer } from "@/utils/normalize-answer";
import { CapitalCard } from "./capitals/CapitalCard";
import { FlagDisplay } from "./FlagDisplay";

/** Juegos de tarjeta + input (`Session`). Países tiene su tablero (`session/countries/`). */
export type CardGameType = Exclude<GameType, "countries">;

export function isCardGameType(gameType: GameType): gameType is CardGameType {
	return gameType !== "countries";
}

/**
 * Lo que cambia por juego dentro de `Session` y de la práctica diaria (D068):
 * qué se muestra, qué respuesta vale y los textos del input. Todo lo demás
 * (cola, cronómetro, calificación, resultados) es igual para todos.
 */
export interface SessionCard {
	/**
	 * Lo que se pregunta: la bandera, o el nombre del país en Capitales.
	 * `feedback` anima el marco al acertar o fallar (D151); la práctica
	 * diaria no lo pasa.
	 */
	renderStimulus: (country: Country, feedback?: AnswerStatus) => ReactNode;
	/** La respuesta que se enseña al acertar, fallar o revelar. */
	getAnswer: (country: Country) => string;
	isCorrect: (
		answer: string,
		country: Country,
		difficulty: Difficulty,
	) => boolean;
	/** ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #21) en Capitales. */
	getQuestion: (country: Country) => string;
	placeholder: string;
	/** Se añade al aviso de acierto o fallo: otras respuestas que valen y la nota. */
	renderAnswerNote?: (country: Country) => ReactNode;
	/**
	 * La práctica diaria no tiene input ni pregunta: si la tarjeta sola no
	 * dice qué se pregunta (el nombre de un país, en Capitales), se muestra la
	 * pregunta encima. Banderas no la necesita y no cambia.
	 */
	showQuestionInDaily?: boolean;
}

/** "También vale La Paz." + la nota de la capital, si tiene. */
function CapitalAnswerNote({ code }: { code: string }) {
	const capital = getCapital(code);
	if (!capital) return null;

	const alternatives = getAcceptedCapitals(capital).slice(1);
	if (alternatives.length === 0 && !capital.note) return null;

	// ⚠️ Copy provisional ("También vale") — `CONTENT_CHECKLIST.md` #21; las
	// notas, #22.
	return (
		<span className="mt-1 block">
			{alternatives.length > 0 && (
				<>
					También vale{" "}
					{new Intl.ListFormat("es", { type: "disjunction" }).format(
						alternatives,
					)}
					.{" "}
				</>
			)}
			{capital.note}
		</span>
	);
}

export const SESSION_CARDS: Record<CardGameType, SessionCard> = {
	// Banderas compara con `isCorrectAnswer` tal cual, no con el comparador de
	// Capitales: así acepta exactamente lo mismo que antes (D068).
	flags: {
		renderStimulus: (country, feedback) => (
			<FlagDisplay countryCode={country.code} feedback={feedback} />
		),
		getAnswer: (country) => country.name,
		isCorrect: (answer, country, difficulty) =>
			isCorrectAnswer(answer, country.name, difficulty),
		getQuestion: () => "¿Qué país representa esta bandera?",
		placeholder: "Escribe el nombre del país",
	},
	capitals: {
		renderStimulus: (country, feedback) => (
			<CapitalCard countryName={country.name} feedback={feedback} />
		),
		// `startGame` solo arma partidas con países del catálogo y
		// `capitals.test.ts` exige una capital por cada uno: el "" no debería
		// verse nunca.
		getAnswer: (country) => getCapital(country.code)?.name ?? "",
		isCorrect: (answer, country, difficulty) =>
			isCorrectCapital(answer, country.code, difficulty),
		getQuestion: (country) => `¿Cuál es la capital de ${country.name}?`,
		placeholder: "Escribe el nombre de la capital",
		renderAnswerNote: (country) => <CapitalAnswerNote code={country.code} />,
		showQuestionInDaily: true,
	},
};
