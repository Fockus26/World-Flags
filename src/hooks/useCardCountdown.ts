import { useEffect, useRef, useState } from "react";

interface UseCardCountdownOptions {
	/** Si el temporizador está activo en esta sesión (p. ej. `timerEnabled`). */
	enabled: boolean;
	/** Segundos con los que arranca cada tarjeta nueva. */
	duration: number;
	/** Identifica la tarjeta actual: al cambiar, el conteo se reinicia. */
	cardCode: string | null;
	/** El conteo se congela mientras esto sea `true` (respuesta ya calificada, modal abierto…). */
	isPaused: boolean;
	/** Se llama cuando el tiempo llega a 0 en la tarjeta actual. */
	onExpire: () => void;
}

/**
 * Cuenta atrás por tarjeta, extraída del efecto de temporizador de
 * `Session.tsx` (práctica de Banderas) para reutilizarla en la práctica de
 * Países (`CountriesPractice.tsx`) sin duplicar su lógica ni su comentario.
 * `Session.tsx` no se tocó para usar este hook — fuera de alcance de esta
 * unidad, ver `context/plans/modo-paises.md` Fase 5, paso 8.
 */
export function useCardCountdown({
	enabled,
	duration,
	cardCode,
	isPaused,
	onExpire,
}: UseCardCountdownOptions): number {
	const [timeLeft, setTimeLeft] = useState<number>(duration);
	// Código de la tarjeta a la que pertenece el `timeLeft` actual: al avanzar
	// de tarjeta, el efecto necesita reiniciar el conteo en el mismo pase en
	// el que detecta el cambio, antes de evaluar si expiró — si no, lee el
	// `timeLeft` viejo (0) de la tarjeta anterior y salta dos.
	const cardCodeRef = useRef<string | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: onExpire estabilizado por React Compiler (ver docs/components.md)
	useEffect(() => {
		if (!enabled) return;
		if (isPaused) return;

		// Tarjeta nueva: reinicia el conteo. Se calcula `effectiveTimeLeft` en
		// vez de depender de que el `setTimeLeft` dispare un re-render — si
		// `timeLeft` ya valía `duration` (p. ej. la primerísima tarjeta, que
		// arranca con ese mismo valor de estado inicial), React no renderiza
		// de nuevo porque el valor no cambia, y este efecto nunca volvería a
		// correr para programar el `setTimeout` de abajo: el cronómetro se
		// quedaría congelado desde el inicio. Usar el valor calculado también
		// evita el problema original (leer el `timeLeft` de la tarjeta
		// anterior y disparar un segundo "saltar").
		const isNewCard = cardCodeRef.current !== cardCode;
		if (isNewCard) {
			cardCodeRef.current = cardCode;
			setTimeLeft(duration);
		}
		const effectiveTimeLeft = isNewCard ? duration : timeLeft;

		if (effectiveTimeLeft <= 0) {
			onExpire();
			return;
		}
		const timeoutId = window.setTimeout(() => {
			setTimeLeft((currentValue) => currentValue - 1);
		}, 1000);
		return () => window.clearTimeout(timeoutId);
	}, [enabled, duration, cardCode, timeLeft, isPaused]);

	return timeLeft;
}
