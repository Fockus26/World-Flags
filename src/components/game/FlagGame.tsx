import { useRef } from "react";
import { PageFlip } from "@/components/app/PageFlip";
import { SystemSnackbars } from "@/components/app/SystemSnackbars";
import { Button } from "@/components/ui/Button";
import { useGame } from "@/hooks/useGame";
import { AchievementToasts } from "./AchievementToasts";
import { Configuration } from "./configuration/Configuration";
import { Results } from "./Results";
import { CountriesPractice } from "./session/countries/CountriesPractice";
import { CountriesRush } from "./session/countries/CountriesRush";
import { DailyPractice } from "./session/DailyPractice";
import { Session } from "./session/Session";

// "results" no gira: entra de abajo hacia arriba (ver FlagGameContent). Solo
// las vistas que sí participan del giro 3D viven en este tipo.
type FlipViewKey = "session" | "dailyPractice" | "configuration";

/**
 * TEMPORAL — Fase 2 de `context/plans/modo-capitales.md`, se sustituye en la
 * Fase 5 por la sesión generalizada. Sin esto, una partida de Capitales caería
 * en `Session` (Banderas), que califica el progreso de Banderas. No llega a
 * producción: el modo se despliega entero con su PR.
 */
function CapitalsPlaceholder({ onExit }: { onExit: () => void }) {
	return (
		<section className="flex w-[min(100%,58rem)] flex-col items-center gap-4 rounded-lg border border-surface-border bg-surface p-[0.85rem] text-center min-[44rem]:rounded-2xl">
			<p className="m-0 font-extrabold text-surface-soft">
				Capitales — en construcción
			</p>
			<Button type="button" color="neutral" onClick={onExit}>
				Salir
			</Button>
		</section>
	);
}

function FlagGameContent() {
	const {
		activeGame,
		lastResult,
		dailyPracticeQueue,
		exitGame,
		exitDailyPractice,
		finishDailyPractice,
		restartGame,
	} = useGame();

	const liveFlipKey: FlipViewKey = activeGame
		? "session"
		: dailyPracticeQueue
			? "dailyPractice"
			: "configuration";

	// Mientras se muestran resultados, el giro se queda clavado en lo que
	// mostraba justo antes de terminar la partida (normalmente "session"),
	// en vez de seguir a `liveFlipKey` hacia "configuration". Resultados es
	// una tarjeta centrada, no una pantalla completa: si el giro de abajo
	// ya hubiera girado a "configuración", el menú se asomaba por los
	// márgenes alrededor de la tarjeta. Solo se deja avanzar cuando
	// `lastResult` se limpia (Volver al inicio / Repetir práctica).
	const lastFlipKeyRef = useRef<FlipViewKey>(liveFlipKey);
	if (!lastResult) {
		lastFlipKeyRef.current = liveFlipKey;
	}
	const flipViewKey = lastResult ? lastFlipKeyRef.current : liveFlipKey;

	function renderFlipView(key: FlipViewKey) {
		switch (key) {
			case "session":
				// `key` distinto por partida (no por configuración): al repetir
				// desde Resultados, `activeGame` cambia pero seguiría siendo la
				// misma vista "session" para el giro — sin esto, `Session` no
				// remontaría y arrancaría la partida nueva con el índice/estado
				// interno de la que acaba de terminar.
				if (activeGame?.configuration.gameType === "countries") {
					if (activeGame.configuration.mode === "competitive") {
						return <CountriesRush key={activeGame.id} />;
					}
					return <CountriesPractice key={activeGame.id} />;
				}
				if (activeGame?.configuration.gameType === "capitals") {
					return <CapitalsPlaceholder key={activeGame.id} onExit={exitGame} />;
				}
				return <Session key={activeGame?.id} />;
			case "dailyPractice":
				return dailyPracticeQueue ? (
					<DailyPractice
						gameType={dailyPracticeQueue.gameType}
						countryCodes={dailyPracticeQueue.codes}
						onComplete={finishDailyPractice}
						onAbandon={exitDailyPractice}
					/>
				) : null;
			case "configuration":
				return <Configuration />;
		}
	}

	return (
		<div className="relative h-full w-full">
			<div
				className="h-full w-full"
				// El giro sigue tapado detrás de "Resultados" pero no deja de
				// estar montado: sin esto, sus controles (p. ej. "Comenzar
				// práctica") quedan alcanzables con Tab aunque no se vean.
				inert={lastResult !== null}
				aria-hidden={lastResult !== null || undefined}
			>
				<PageFlip viewKey={flipViewKey} renderView={renderFlipView} />
			</div>

			{/* Los resultados no participan del giro: entran de abajo hacia
			    arriba y tapan por completo lo de atrás, así que el giro hacia
			    "configuración" (o hacia la siguiente partida, al repetir) que
			    pasa detrás mientras tanto no se llega a ver. */}
			{lastResult && (
				<div className="absolute inset-0 grid place-items-center animate-in fade-in-0 slide-in-from-bottom-8 duration-300 ease-out">
					<Results
						result={lastResult}
						onRestart={restartGame}
						onExit={exitGame}
					/>
				</div>
			)}
		</div>
	);
}

export default function FlagGame() {
	return (
		<main
			id="main-content"
			className="relative grid h-dvh w-full place-items-center overflow-hidden p-[0.4rem] sm:p-[clamp(0.5rem,2vh,1.5rem)]"
		>
			<FlagGameContent />
			{/* Fuera de `FlagGameContent`: tiene que verse en cualquier vista
			    (sesión, práctica diaria, resultados...), no solo en una. */}
			<AchievementToasts />
			<SystemSnackbars />
		</main>
	);
}
