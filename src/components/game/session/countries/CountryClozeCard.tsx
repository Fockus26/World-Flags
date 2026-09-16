import type { RefObject } from "react";
import { countries as allCountries } from "@/data/countries";
import { buildBoard } from "@/utils/country-board";
import type { BoardSlotState } from "./BoardSlot";
import { CountryBoard } from "./CountryBoard";

interface CountryClozeCardProps {
	countryCode: string;
	/**
	 * Estado del hueco objetivo. El plan original (`context/plans/modo-paises.md`
	 * Fase 6) proponía un `isRevealed: boolean`, pero `CountriesPractice`
	 * (Fase 5) también necesita distinguir "target"/"missed" (un fallo se
	 * muestra en rojo, no como un hueco sin más) — así que este componente
	 * recibe el estado completo y `DailyPractice` (que nunca falla, solo
	 * revela) simplemente nunca le pasa "missed".
	 */
	targetState: BoardSlotState;
	hintLetters?: number;
	flyingCodes?: ReadonlySet<string>;
	slotRefs: RefObject<Map<string, HTMLLIElement>>;
	className?: string;
}

/**
 * Tarjeta cloze compartida por la práctica de países (Fase 5) y la práctica
 * diaria de países (Fase 6, D034): el tablero del continente ENTERO del país
 * objetivo, con todos los demás como contexto visible.
 */
export function CountryClozeCard({
	countryCode,
	targetState,
	hintLetters,
	flyingCodes,
	slotRefs,
	className,
}: CountryClozeCardProps) {
	const country = allCountries.find((candidate) => candidate.code === countryCode);

	if (!country) {
		return null;
	}

	const board = buildBoard(
		allCountries.filter((candidate) => candidate.region === country.region),
	);

	return (
		<CountryBoard
			className={className}
			groups={board}
			stateByCode={{ [countryCode]: targetState }}
			defaultState="context"
			flyingCodes={flyingCodes}
			hintLetters={hintLetters}
			slotRefs={slotRefs}
		/>
	);
}
