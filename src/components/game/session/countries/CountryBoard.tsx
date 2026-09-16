import type { RefObject } from "react";
import { useRef } from "react";
import type { BoardGroup } from "@/utils/country-board";
import { BoardSlot, type BoardSlotState } from "./BoardSlot";

const RESOLVED_STATES: ReadonlySet<BoardSlotState> = new Set([
	"revealed",
	"missed",
]);

interface CountryBoardProps {
	groups: BoardGroup[];
	/** Estado de cada país por código. Ausente = `defaultState`. */
	stateByCode: Record<string, BoardSlotState>;
	/**
	 * Estado por defecto de un país sin entrada en `stateByCode`: el rush
	 * arranca todo "hidden"; la tarjeta cloze de práctica arranca todo
	 * "context" salvo el país objetivo (que sí trae su propia entrada).
	 */
	defaultState?: BoardSlotState;
	/** Códigos que están volando en este momento hacia su hueco (ver `useFlyToSlot`). */
	flyingCodes?: ReadonlySet<string>;
	/** Letras de pista para el único país en estado "target" (tarjeta cloze). */
	hintLetters?: number;
	/**
	 * Si viene, el contador de cada continente cuenta estos códigos en vez de
	 * los huecos resueltos en pantalla. La tarjeta cloze lo necesita: su único
	 * hueco "resuelto" es el objetivo, que se resuelve y vuelve a "context" en
	 * cada tarjeta — contado así, el encabezado saltaba 0/12 → 1/12 → 0/12.
	 */
	countedCodes?: ReadonlySet<string>;
	/** Expone los `<li>` del DOM por código: `useFlyToSlot` los necesita para medir su posición. */
	slotRefs: RefObject<Map<string, HTMLLIElement>>;
	className?: string;
}

/**
 * Tablero de países agrupado por continente (D038). El contenedor con scroll
 * es este componente (`overflow-y-auto`), nunca la página — el resto de la
 * tarjeta de sesión mantiene su alto fijo alrededor.
 */
export function CountryBoard({
	groups,
	stateByCode,
	defaultState = "hidden",
	flyingCodes,
	hintLetters,
	countedCodes,
	slotRefs,
	className,
}: CountryBoardProps) {
	// Callback ref ESTABLE por código, cacheado en un ref propio: un callback
	// nuevo en cada render (la forma más simple de escribir esto) haría que
	// React desmontara y volviera a montar la referencia de los ~196 `<li>`
	// del mundo completo en cada tecla escrita en el rush — coste real, no
	// solo estético (ver la fila de "tecleo lento con 196 slots" en los
	// riesgos de `context/plans/modo-paises.md`).
	const slotRefCallbacksRef = useRef(
		new Map<string, (element: HTMLLIElement | null) => void>(),
	);

	function getSlotRefCallback(code: string) {
		const cache = slotRefCallbacksRef.current;
		const cached = cache.get(code);
		if (cached) return cached;

		const callback = (element: HTMLLIElement | null) => {
			const map = slotRefs.current;
			if (element) {
				map.set(code, element);
			} else {
				map.delete(code);
			}
		};
		cache.set(code, callback);
		return callback;
	}

	// Un país recién acertado sigue viéndose sin descubrir mientras su clon
	// vuela (`useFlyToSlot`): el verde aparece cuando el texto aterriza, no
	// antes — si no, el hueco se pintaba de verde con el nombre todavía lejos.
	function getVisibleState(code: string): BoardSlotState {
		const state = stateByCode[code] ?? defaultState;
		return state === "revealed" && flyingCodes?.has(code) ? "hidden" : state;
	}

	return (
		// <section> con aria-label (no un <div role="group">, que biome pide
		// cambiar por un elemento semántico): así ya tiene el equivalente de
		// role="region" implícito, la forma correcta para "una sección
		// perceptible de la página" — no es un grupo de controles de formulario.
		<section
			className={`min-h-0 flex-1 overflow-y-auto ${className ?? ""}`}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: patrón recomendado por WAI-ARIA para que una región con su propio scroll sea alcanzable por teclado. Sin esto, axe-core marca "scrollable-region-focusable" (serio) — verificado en el navegador.
			tabIndex={0}
			aria-label={`Tablero de ${groups.map((group) => group.label).join(" + ")}`}
		>
			{/* El padding deja sitio al anillo del hueco objetivo (`ring-2`, se
			    dibuja por fuera del borde): sin él, el `overflow-y-auto` lo
			    recortaba en los huecos pegados a un borde. El de abajo es más
			    generoso para que el final del scroll no quede pegado al borde. */}
			<div className="flex flex-col gap-4 p-1 pb-4">
				{groups.map((group) => {
					const resolvedCount = group.countries.filter((country) =>
						countedCodes
							? countedCodes.has(country.code)
							: RESOLVED_STATES.has(getVisibleState(country.code)),
					).length;
					const headingId = `board-group-${group.region}`;

					return (
						<section key={group.region} aria-labelledby={headingId}>
							<h3
								id={headingId}
								className="m-0 mb-1.5 text-xs font-extrabold uppercase tracking-wide text-text-placeholder"
							>
								{group.label} · {resolvedCount}/{group.countries.length}
							</h3>
							<ol className="m-0 flex list-none flex-wrap gap-1.5 p-0">
								{group.countries.map((country) => {
									const state = getVisibleState(country.code);

									return (
										<BoardSlot
											key={country.code}
											ref={getSlotRefCallback(country.code)}
											country={country}
											state={state}
											isFlying={flyingCodes?.has(country.code)}
											hintLetters={state === "target" ? hintLetters : undefined}
										/>
									);
								})}
							</ol>
						</section>
					);
				})}
			</div>
		</section>
	);
}
