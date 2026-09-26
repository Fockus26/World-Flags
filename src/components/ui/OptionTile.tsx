import { type AnimationEvent, type ReactNode, useState } from "react";
import { useSelectSound } from "@/hooks/useSelectSound";

interface OptionTileProps {
	name: string;
	value: string;
	checked: boolean;
	onChange: () => void;
	children: ReactNode;
}

/**
 * Opción segmentada de selección única (radio nativo accesible) alineada con
 * los tokens de HeroUI (`--accent`, `--default`, `--border`, `--radius`).
 *
 * Suena el "tic" de selección al elegir (D143), por dentro: quien la usa no
 * cambia nada.
 *
 * Movimiento (D157–D158): al pasar gana `shadow-sm`, al pulsar escala a 0,98
 * y, al elegirla, hace un "pop" (`zoom-in-95` → 100 %). El pop solo sale de
 * una elección real (el `onChange` del radio): al montar o al llegar la
 * opción guardada ya marcada no se anima. Todo el movimiento va con
 * `motion-safe:`; con movimiento reducido queda la sombra y el color.
 *
 * **No sube 2 px al pasar**, a diferencia de las tarjetas de continente y del
 * selector de juego (D157): casi todos sus consumidores la ponen dentro de un
 * `overflow-hidden` pegada al borde (`AutoHeight`, las pestañas del modal de
 * configuración). Medido: "5 s" queda a 0 px del borde superior de su
 * `AutoHeight` y la columna derecha a 0 px del borde derecho del panel, así
 * que el desplazamiento le cortaba el borde de arriba.
 */
export function OptionTile({
	name,
	value,
	checked,
	onChange,
	children,
}: OptionTileProps) {
	const withSelectSound = useSelectSound();
	const [isPopping, setIsPopping] = useState(false);
	// `animationend` burbujea: solo cuenta el del propio pop. (React no expone
	// `animationcancel`; si el pop se cortara, la clase se queda puesta sin
	// efecto hasta el siguiente `animationend`.)
	const endPop = (event: AnimationEvent<HTMLLabelElement>) => {
		if (event.target === event.currentTarget) setIsPopping(false);
	};

	return (
		<label
			onAnimationEnd={endPop}
			// Sin `transition-colors` (D129 le quita `outline-color`, aquí se hace
			// igual a mano): la lista suma sombra y `scale`, que en Tailwind 4 es
			// una propiedad propia y no pisa el `transform` del pop.
			className={`
				group relative flex w-full min-w-0 cursor-pointer items-center justify-center
				rounded-[var(--radius)] border border-[var(--border)] bg-[var(--default)]
				text-[var(--default-foreground)]
				transition-[color,background-color,border-color,box-shadow,scale]
				duration-150 ease-in-out
				min-h-10 sm:min-h-11
				hover:bg-[var(--default-hover)] hover:shadow-sm
				motion-safe:active:scale-98
				has-checked:border-[var(--accent)] has-checked:bg-[var(--accent)]
				has-checked:text-[var(--accent-foreground)]
				has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-offset-2
				has-focus-visible:outline-[var(--focus)]
				${isPopping ? "motion-safe:animate-in motion-safe:zoom-in-95" : ""}
			`}
		>
			<input
				type="radio"
				name={name}
				value={value}
				checked={checked}
				onChange={withSelectSound(() => {
					onChange();
					setIsPopping(true);
				})}
				className="pointer-events-none absolute size-px opacity-0"
			/>
			<span className="px-3 py-2 text-xs font-bold sm:text-sm">{children}</span>
		</label>
	);
}
