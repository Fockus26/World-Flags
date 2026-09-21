import { Skeleton as HeroSkeleton } from "@heroui/react";
import type { ReactNode } from "react";

/**
 * Cuánto tarda un skeleton en hacerse visible desde que se monta (D042).
 * Si los datos llegan antes — el invitado, que se hidrata de `localStorage`
 * en milisegundos —, el skeleton se desmonta sin haberse visto: un parpadeo
 * de gris de 10 ms es peor que un hueco vacío durante 10 ms. Lo usa también
 * `LoadingAnnouncer` para no anunciar "cargando" cuando no se llegó a ver.
 */
export const SKELETON_DELAY_MS = 300;

interface SkeletonProps {
	/** Tamaño, forma y posición. Por defecto es `block`. */
	className?: string;
	/**
	 * `line`: una línea de texto. El bloque mide el alto de línea completo
	 * (el mismo que el texto real, para no mover el layout) pero se pinta al
	 * 75 % de alto, centrado, para que se lea como texto y no como un botón.
	 */
	shape?: "block" | "line";
	/**
	 * Contenido de referencia, invisible: da al bloque el ancho y el alto de
	 * línea exactos del contenido real sin inventar medidas (mismo patrón que
	 * el hueco de `BoardSlot`, D038). Hereda la tipografía de `className` o
	 * del padre. Sin `children`, la geometría sale solo de `className`.
	 */
	children?: ReactNode;
	/** `false`: bloque quieto, sin brillo (p. ej. un avatar que no cargó). */
	animated?: boolean;
}

/**
 * Wrapper del `Skeleton` de HeroUI v3. El color sale de `--surface-tertiary`,
 * puenteado a la marca en `heroui-theme.css` (D043).
 *
 * Siempre `aria-hidden`: un skeleton no es contenido. Quien lo usa se ocupa
 * de marcar la zona como ocupada (`aria-busy` / `inert`) y, si hace falta,
 * de anunciar la carga con `LoadingAnnouncer`.
 */
export function Skeleton({
	className,
	shape = "block",
	children,
	animated = true,
}: SkeletonProps) {
	return (
		<HeroSkeleton<"span">
			// <span> en vez del <div> por defecto: va dentro de <label>, <h1> y
			// <button>, que solo admiten contenido de frase.
			render={(props) => <span {...props} />}
			// Explícito: sin la prop, HeroUI lee `--skeleton-animation` del DOM
			// ya en el cliente y el HTML que prerenderiza Astro no coincidiría.
			animationType={animated ? "shimmer" : "none"}
			aria-hidden="true"
			className={[
				"block",
				// Entra con un fundido tras `SKELETON_DELAY_MS` (el `delay` va
				// inline, abajo). Con movimiento reducido, el bloque global de
				// `global.css` deja el fundido en 0.01 ms pero respeta la espera.
				"animate-in fade-in fill-mode-backwards duration-200",
				// El brillo vive en `::after`, que el `*` del bloque de
				// movimiento reducido de `global.css` no alcanza.
				"motion-reduce:after:animate-none",
				shape === "line" ? "scale-y-75" : "",
				className ?? "",
			]
				.filter(Boolean)
				.join(" ")}
			style={{ animationDelay: `${SKELETON_DELAY_MS}ms` }}
		>
			{/* `flex flex-col` y no `block`: si la referencia es un elemento
			    `inline-flex` (un `Button`), como bloque le sumaría debajo el
			    hueco de la línea base; como ítem flex mide lo mismo que fuera. */}
			{children !== undefined && (
				<span className="invisible flex flex-col">{children}</span>
			)}
		</HeroSkeleton>
	);
}
