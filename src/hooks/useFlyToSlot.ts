import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";

/**
 * Duración y curva del vuelo (D037). No hay un token de `DESIGN_TOKENS.md`
 * para una animación JS de esta duración (los tokens existentes son
 * transiciones CSS de 150-200ms) — constantes con nombre en vez de un valor
 * suelto, tal como pide el plan cuando no hay token que reutilizar.
 */
const FLIGHT_DURATION_MS = 450;
const FLIGHT_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

interface FlyOptions {
	/** Texto a mostrar en el clon — normalmente el nombre del país, tal cual se ve en su hueco. */
	text: string;
	/** Elemento del que "sale" el vuelo (el input de texto). */
	fromEl: HTMLElement;
	/** Código del país cuyo hueco en el tablero es el destino. */
	toCode: string;
	/**
	 * Se llama cuando el vuelo termina (o de inmediato si no hay slot que
	 * animar, o si `prefers-reduced-motion` pide evitar la animación). Quien
	 * llama debe usar esto para pasar el hueco de "volando" (texto invisible)
	 * a visible.
	 */
	onLanded: () => void;
}

/**
 * Anima el texto de un país "volando" desde `fromEl` hasta su hueco en el
 * tablero, con la Web Animations API — no framer-motion, que no ejecuta en
 * este stack (D037, ver `context/decisions/03-animaciones.md`).
 *
 * Técnica FLIP: el clon se posiciona YA en su lugar final (el del hueco) y
 * se anima un `transform` que lo trae desde la posición de `fromEl` hasta
 * `none` — así el navegador nunca tiene que recalcular layout a mitad de la
 * animación, solo composita un `transform`/`opacity`.
 */
export function useFlyToSlot(slotRefs: RefObject<Map<string, HTMLLIElement>>) {
	// Uno o más vuelos pueden estar en el aire a la vez (varios aciertos
	// seguidos rápido): cada uno es un clon independiente.
	const activeClonesRef = useRef<Set<HTMLElement>>(new Set());

	useEffect(() => {
		const clones = activeClonesRef.current;
		return () => {
			for (const clone of clones) {
				clone.remove();
			}
			clones.clear();
		};
	}, []);

	const fly = useCallback(
		({ text, fromEl, toCode, onLanded }: FlyOptions) => {
			const slot = slotRefs.current.get(toCode);

			if (!slot) {
				onLanded();
				return;
			}

			// Scroll instantáneo ANTES de medir cualquier posición: si el
			// tablero se desplazara con animación mientras se toman las
			// medidas, la posición final leída no sería la real y el clon
			// aterrizaría en el sitio equivocado.
			slot.scrollIntoView({ block: "nearest", behavior: "auto" });

			const prefersReducedMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;

			if (prefersReducedMotion) {
				onLanded();
				return;
			}

			const fromRect = fromEl.getBoundingClientRect();
			const toRect = slot.getBoundingClientRect();
			const slotStyle = window.getComputedStyle(slot);
			const fromStyle = window.getComputedStyle(fromEl);

			const fromFontSize = Number.parseFloat(fromStyle.fontSize) || 16;
			const toFontSize = Number.parseFloat(slotStyle.fontSize) || 16;
			const scale = fromFontSize / toFontSize;

			const clone = document.createElement("span");
			clone.textContent = text;
			clone.setAttribute("aria-hidden", "true");
			// Tipografía del slot, no la del input: el clon debe verse como
			// el país que va a aterrizar, no como lo que se escribió.
			clone.style.position = "fixed";
			clone.style.left = `${toRect.left}px`;
			clone.style.top = `${toRect.top}px`;
			clone.style.margin = "0";
			clone.style.pointerEvents = "none";
			clone.style.zIndex = "9999";
			clone.style.fontSize = slotStyle.fontSize;
			clone.style.fontWeight = slotStyle.fontWeight;
			clone.style.fontFamily = slotStyle.fontFamily;
			clone.style.color = slotStyle.color;
			clone.style.whiteSpace = "nowrap";
			clone.style.transformOrigin = "top left";

			document.body.appendChild(clone);
			activeClonesRef.current.add(clone);

			const dx = fromRect.left - toRect.left;
			const dy = fromRect.top - toRect.top;

			const animation = clone.animate(
				[
					{
						transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
						opacity: 0.9,
					},
					{ transform: "none", opacity: 1 },
				],
				{
					duration: FLIGHT_DURATION_MS,
					easing: FLIGHT_EASING,
					fill: "forwards",
				},
			);

			function land() {
				clone.remove();
				activeClonesRef.current.delete(clone);
				onLanded();
			}

			// "cancel" cubre el desmontaje a mitad de vuelo (p. ej. se
			// abandona la partida mientras un país está en el aire): sin
			// esto, `onLanded` nunca llegaría a llamarse en ese caso.
			animation.addEventListener("finish", land);
			animation.addEventListener("cancel", land);
		},
		[slotRefs],
	);

	return { fly };
}
