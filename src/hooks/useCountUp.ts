import { useEffect, useState } from "react";

/**
 * Cuánto tarda un número de Resultados en contar de 0 a su valor (D154).
 * Token de movimiento propio (`DESIGN_TOKENS.md`): los de transición (150–200 ms)
 * se quedan cortos para que se lea que el número sube.
 */
export const COUNT_UP_DURATION_MS = 600;

/**
 * Margen de la red de seguridad sobre la duración: si `requestAnimationFrame`
 * no llega (pestaña en segundo plano, visto en el tutorial), el valor final
 * queda puesto igualmente con un `setTimeout`, que sí corre, aunque tarde.
 */
const FALLBACK_MARGIN_MS = 100;

function prefersReducedMotion(): boolean {
	if (typeof window === "undefined") return false;

	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Arranca rápido y frena al llegar: se lee como un marcador que se asienta. */
function easeOutCubic(progress: number): number {
	return 1 - (1 - progress) ** 3;
}

export interface CountUp {
	/** Valor a pintar ahora (sin redondear: cada uso lo formatea). */
	value: number;
	/**
	 * `true` en cuanto el valor final está puesto. Siempre llega **después**
	 * del montaje (también con movimiento reducido), para que una región
	 * `aria-live` que lo espere anuncie el valor final y solo ese.
	 */
	done: boolean;
}

/**
 * Cuenta de 0 a `target` en `durationMs` con `requestAnimationFrame` (D154).
 * Con movimiento reducido, o si no hay nada que contar, pinta el valor final
 * desde el primer render.
 */
export function useCountUp(
	target: number,
	durationMs: number = COUNT_UP_DURATION_MS,
): CountUp {
	const [countUp, setCountUp] = useState<CountUp>(() => ({
		value: target <= 0 || prefersReducedMotion() ? target : 0,
		done: false,
	}));

	useEffect(() => {
		if (target <= 0 || prefersReducedMotion()) {
			setCountUp({ value: target, done: true });
			return;
		}

		const startedAt = performance.now();
		let frameId = 0;
		let fallbackId = 0;

		const finish = () => {
			window.cancelAnimationFrame(frameId);
			window.clearTimeout(fallbackId);
			setCountUp({ value: target, done: true });
		};

		const tick = (now: number) => {
			const progress = (now - startedAt) / durationMs;

			if (progress >= 1) {
				finish();
				return;
			}

			setCountUp({
				value: target * easeOutCubic(Math.max(0, progress)),
				done: false,
			});
			frameId = window.requestAnimationFrame(tick);
		};

		fallbackId = window.setTimeout(finish, durationMs + FALLBACK_MARGIN_MS);
		frameId = window.requestAnimationFrame(tick);

		return () => {
			window.cancelAnimationFrame(frameId);
			window.clearTimeout(fallbackId);
		};
	}, [target, durationMs]);

	return countUp;
}
