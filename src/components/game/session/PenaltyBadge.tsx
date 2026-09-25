import { useEffect, useRef, useState } from "react";
import { formatPenalty } from "@/utils/rush-penalty";

/** Un castigo del competitivo tal como lo ve el cronómetro: `id` único por evento (D132). */
export interface PenaltyEvent {
	id: number;
	penaltyMs: number;
}

// Cuánto se queda el "+10 s" a la vista antes de irse, y cuánto dura su
// salida. La suma es lo que vive montado: con la pausa de 900 ms del rush
// entre tarjetas, dos castigos seguidos se solapan como mucho en la salida
// del primero (D133).
const PENALTY_VISIBLE_MS = 900;
const PENALTY_EXIT_MS = 300;

interface PenaltyBadgeProps {
	penaltyMs: number;
	/** Se llama al terminar la salida, para que el padre lo quite de la lista. */
	onDone: () => void;
}

/**
 * El "+10 s" / "+20 s" que sube al lado del cronómetro al fallar o saltar en
 * competitivo (D132). Solo visual (`aria-hidden`): el anuncio lo hace la región
 * `aria-live` de `Header`. Entra subiendo y se va desvaneciéndose hacia
 * arriba con `tw-animate-css` (D006); con movimiento reducido aparece y
 * desaparece sin animación (`motion-reduce:animate-none`), porque la vida del
 * badge la marcan estos temporizadores, no el fin de la animación.
 *
 * Quien lo pinta le pone `key` por evento: cada castigo remonta el suyo y
 * arranca su propia animación, aunque el anterior siga saliendo.
 */
export function PenaltyBadge({ penaltyMs, onDone }: PenaltyBadgeProps) {
	const [isExiting, setIsExiting] = useState(false);
	// `onDone` llega como flecha nueva en cada render del padre (el cronómetro
	// renderiza cada 100 ms): si fuera dependencia del efecto, los
	// temporizadores se reiniciarían sin parar y el badge no se iría nunca.
	// Se lee del ref, y los temporizadores se programan una sola vez.
	const onDoneRef = useRef(onDone);
	useEffect(() => {
		onDoneRef.current = onDone;
	});

	useEffect(() => {
		const exitId = window.setTimeout(
			() => setIsExiting(true),
			PENALTY_VISIBLE_MS,
		);
		const doneId = window.setTimeout(
			() => onDoneRef.current(),
			PENALTY_VISIBLE_MS + PENALTY_EXIT_MS,
		);
		return () => {
			window.clearTimeout(exitId);
			window.clearTimeout(doneId);
		};
	}, []);

	return (
		<span
			aria-hidden="true"
			className={`pointer-events-none absolute inset-y-0 right-full flex items-center pr-2 font-extrabold whitespace-nowrap text-danger-hover tabular-nums motion-reduce:animate-none ${
				isExiting
					? "animate-out fade-out-0 slide-out-to-top-3 fill-mode-forwards duration-300"
					: "animate-in fade-in-0 slide-in-from-bottom-3 duration-200"
			}`}
		>
			{formatPenalty(penaltyMs)}
		</span>
	);
}
