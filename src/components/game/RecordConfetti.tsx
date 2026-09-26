import type { CSSProperties } from "react";

/**
 * Colores del confeti: tokens del tema (se repintan solos en oscuro). Es pura
 * decoración (`aria-hidden`), así que no cuenta el contraste.
 */
const PIECE_COLORS = [
	"bg-medal-gold",
	"bg-primary",
	"bg-success",
	"bg-danger",
	"bg-secondary",
	"bg-warning",
] as const;

/** Tiras y cuadraditos, de la escala de Tailwind (sin valores sueltos). */
const PIECE_SHAPES = ["w-2 h-2", "w-1.5 h-3"] as const;

const PIECE_COUNT = 20;

interface ConfettiPiece {
	className: string;
	style: CSSProperties;
}

/**
 * Las 20 partículas, calculadas una vez al cargar el módulo y siempre iguales:
 * sin `Math.random` en el render (el React Compiler exige render puro) y
 * repartidas a mano con restos de primos para que no salgan en fila. Cada una
 * lleva por variables CSS dónde cae, cuánto se desvía, cuánto gira y su
 * tiempo; la animación es `confetti-fall` de `global.css` (D155).
 */
const PIECES: readonly ConfettiPiece[] = Array.from(
	{ length: PIECE_COUNT },
	(_, index) => {
		const direction = index % 2 === 0 ? 1 : -1;

		return {
			className: `${PIECE_COLORS[index % PIECE_COLORS.length]} ${
				PIECE_SHAPES[index % PIECE_SHAPES.length]
			}`,
			style: {
				left: `${4 + ((index * 47) % 92)}%`,
				"--confetti-drift": `${(((index * 37) % 9) - 4) * 0.75}rem`,
				"--confetti-fall": `${16 + ((index * 11) % 10)}rem`,
				"--confetti-spin": `${direction * (240 + ((index * 53) % 300))}deg`,
				"--confetti-duration": `${1.2 + ((index * 7) % 6) * 0.1}s`,
				"--confetti-delay": `${((index * 3) % 5) * 0.05}s`,
			} as CSSProperties,
		};
	},
);

/**
 * Confeti del nuevo récord (D155): ~20 partículas de CSS puro que caen desde
 * lo alto de la tarjeta de Resultados una sola vez (~1,5 s, lo que dura la
 * fanfarria `record`). Capa `absolute inset-0` con `overflow-hidden`: nada se
 * sale de la tarjeta ni provoca scroll horizontal a 320 px;
 * `pointer-events-none` para no tapar los botones, y `aria-hidden` porque la
 * señal que se lee es la insignia "¡Nuevo récord!". Con movimiento reducido
 * no se pinta.
 */
export function RecordConfetti() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
		>
			{PIECES.map((piece, index) => (
				<span
					// Lista fija que nunca se reordena: el índice es una clave estable.
					// biome-ignore lint/suspicious/noArrayIndexKey: lista fija
					key={index}
					className={`record-confetti-piece absolute -top-3 ${piece.className}`}
					style={piece.style}
				/>
			))}
		</div>
	);
}
