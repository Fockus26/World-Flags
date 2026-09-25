import { type ReactNode, useCallback, useState } from "react";

interface AnimatedHeightProps {
	children: ReactNode;
	className?: string;
}

/**
 * Contenedor que anima su alto cuando cambia el de su contenido (D116): el
 * contenido cambia de golpe y la caja lo sigue con una transición de
 * `height`. Distinto de `AutoHeight` (D009), que abre y cierra un bloque que
 * siempre está montado; aquí el contenido es cualquiera y se mide.
 *
 * Se mide con `ResizeObserver` (no hay `interpolate-size` fiable en este
 * motor y framer no corre aquí, D006), como el alto de las pestañas de
 * `ConfigurationModal` (D010). Detalles:
 *
 * - `offsetHeight` y no `getBoundingClientRect`: la entrada del diálogo de
 *   HeroUI escala el contenido, y una medida transformada se quedaría fija.
 * - Hasta la primera medida el alto es `auto`: el primer frame ya ocupa lo
 *   que debe, sin crecer desde 0.
 * - `flow-root` en la caja medida: los márgenes de sus hijos quedan dentro y
 *   cuentan en la medida (si no, colapsarían hacia fuera y se recortarían).
 * - Con movimiento reducido no hay transición: el alto cambia de golpe.
 *
 * Solo es visual: el contenido está en el DOM desde el primer momento, así
 * que ni el foco ni el lector de pantalla esperan a la transición.
 */
export function AnimatedHeight({ children, className }: AnimatedHeightProps) {
	const [height, setHeight] = useState<number | null>(null);

	// `ref` de callback con identidad estable: se conecta cuando React monta
	// el nodo real y el observador no se recrea en cada render (D010).
	const observeContent = useCallback((node: HTMLDivElement | null) => {
		if (!node) return undefined;

		const measure = () => setHeight(node.offsetHeight);

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			className={[
				// `shrink-0`: dentro de un padre flex en columna (el diálogo de
				// HeroUI lo es) `overflow-hidden` quita el mínimo por contenido
				// y la caja encogería hasta caber, recortando las filas en vez
				// de dejar el scroll al diálogo.
				"shrink-0 overflow-hidden transition-[height] duration-300 ease-in-out motion-reduce:transition-none",
				className ?? "",
			]
				.filter(Boolean)
				.join(" ")}
			style={height === null ? undefined : { height }}
		>
			<div ref={observeContent} className="flow-root">
				{children}
			</div>
		</div>
	);
}
