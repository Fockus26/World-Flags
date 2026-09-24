import { useEffect, useRef, useState } from "react";
import { CountriesPractice } from "@/components/game/session/countries/CountriesPractice";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { Modal } from "@/components/ui/Modal";
import { useSandboxRuntime } from "@/hooks/useSandboxRuntime";
import type { GameMode } from "@/types/country";
import { TutorialModeChoice, TutorialSettings } from "./TutorialSettings";
import { TUTORIAL_STEPS, TUTORIAL_TEXTS } from "./tutorial-script";

const HEADING_ID = "tutorial-step-title";
const LAST_STEP_INDEX = TUTORIAL_STEPS.length - 1;

/**
 * El tamaño de los pasos que solo explican: el de siempre.
 *
 * La transición de ancho y padding es la que suaviza el cambio al empezar y
 * al acabar la partida (el alto va con el contenido y no se puede animar sin
 * medirlo). El bloque global de `prefers-reduced-motion` de `global.css` la
 * reduce a 0,01 ms.
 */
const DIALOG_TRANSITION =
	"transition-[width,padding] duration-300 ease-out text-left";
const STEP_DIALOG_CLASSES = `${DIALOG_TRANSITION} w-[min(58rem,94vw)]`;

/**
 * Mientras se juega, el diálogo hace de `<main>` (D090): con `fillViewport`
 * el contenedor de HeroUI deja de poner margen, y el padding del diálogo es
 * **el mismo que el de `<main>` en `FlagGame`** (`p-[0.4rem]` y, desde `sm`,
 * `p-[clamp(0.5rem,2vh,1.5rem)]`). Así la `<section>` de `CountriesPractice`
 * queda con el mismo ancho que en una partida normal: el viewport menos ese
 * padding, hasta su tope de 58rem. En móvil es una hoja a pantalla entera
 * (sin radio: tocaría los bordes). Si se cambia el padding de `<main>`, hay
 * que cambiarlo aquí también.
 */
const PLAYING_DIALOG_CLASSES = [
	DIALOG_TRANSITION,
	"max-w-none w-full p-[0.4rem] max-sm:rounded-none",
	"sm:p-[clamp(0.5rem,2vh,1.5rem)] sm:w-[min(100vw,calc(58rem_+_2*clamp(0.5rem,2vh,1.5rem)))]",
].join(" ");

interface TutorialProps {
	onClose: () => void;
}

/**
 * La partida guiada de la primera vez (D071).
 *
 * Diálogo modal de HeroUI, no una capa propia: el focus-trap, el cierre con
 * Escape, el `aria-modal` y el bloqueo de scroll ya vienen resueltos ahí. Lo
 * único que se le pide de más es no cerrarse con un clic fuera
 * (`isDismissable={false}`), porque eso perdería el recorrido a medias; Escape
 * sigue cerrándolo. "Saltar tutorial" está en todos los pasos menos el último
 * —también mientras se juega—: ahí ya está "Empezar a jugar", que hace lo
 * mismo, y dos botones para cerrar sobran (D091).
 *
 * Mientras se juega el ejemplo, el diálogo crece hasta el tamaño de una
 * partida normal (D090): ver `PLAYING_DIALOG_CLASSES`.
 *
 * **No resalta ni señala con flechas la UI real.** Las vistas del juego viven
 * dentro del giro 3D de `PageFlip`, que deja montada la vista anterior en su
 * ranura oculta y transforma el contenedor: buscar por selector devolvería dos
 * nodos, y medir posiciones dentro de un `rotateY` con `perspective` da
 * rectángulos proyectados. En vez de eso, los ajustes se enseñan aquí dentro,
 * funcionando (D073), y el paso de cierre dice dónde viven en la app.
 */
export function Tutorial({ onClose }: TutorialProps) {
	const [stepIndex, setStepIndex] = useState(0);
	/**
	 * El modo que se está mirando en su paso. A propósito **no** entra en la
	 * configuración del sandbox: la partida de ejemplo siempre es Práctica
	 * (tres tarjetas no enseñan una carrera contra el reloj), y el paso lo dice
	 * en vez de prometer otra cosa.
	 */
	const [previewMode, setPreviewMode] = useState<GameMode>("practice");

	const sandbox = useSandboxRuntime();

	const headingRef = useRef<HTMLHeadingElement>(null);

	/**
	 * Quién abrió el recorrido, para devolverle el foco al cerrarlo (WCAG
	 * 2.4.3). Hace falta porque React Aria solo restaura el foco cuando ve el
	 * diálogo **pasar** a abierto, y este se monta ya abierto (`FlagGame` lo
	 * renderiza solo mientras lo está, para que cada apertura arranque de cero):
	 * sin esto, cerrarlo deja el foco en `<body>` — comprobado en el navegador.
	 *
	 * Se lee en el inicializador del `ref`, durante el primer render, cuando el
	 * foco todavía está en el botón "Cómo se juega": los efectos —incluido el de
	 * autoenfoque de React Aria y el de abajo— corren después. Abierto solo
	 * (primera visita) no hay origen y no se hace nada.
	 *
	 * En un `ref` y no en una variable de módulo compartida entre las dos
	 * instancias de `useTutorial`: con el React Compiler activo, una copia local
	 * de una variable mutable de módulo se pliega de vuelta a la variable, así
	 * que `const opener = x; x = null; if (!opener)…` se convierte en
	 * `x = null; if (!x)…` y nunca restaura nada. Pasó, y en silencio.
	 */
	const openerRef = useRef<HTMLElement | null>(
		typeof document === "undefined"
			? null
			: (document.activeElement as HTMLElement | null),
	);

	useEffect(() => {
		const opener = openerRef.current;

		if (!opener || opener === document.body) return;

		return () => {
			// En la siguiente tarea, ya desmontado el diálogo: mientras sigue
			// montado, el focus-trap de React Aria devolvería el foco adentro.
			// `setTimeout` y no `requestAnimationFrame` a propósito — rAF no corre
			// con la pestaña en segundo plano, y el foco se quedaría en `<body>`
			// sin que nada lo avisara (también comprobado).
			setTimeout(() => {
				if (document.contains(opener)) opener.focus();
			}, 0);
		};
	}, []);

	const step = TUTORIAL_STEPS[stepIndex];
	const isPlaying = sandbox.state.gameId !== null;
	const hasPlayed = sandbox.state.result !== null;

	/**
	 * Foco al título de cada paso, que lleva el contador dentro: el lector de
	 * pantalla anuncia "Paso 3 de 6, Modo de juego" al llegar. Mientras se
	 * juega no se toca — `AnswerForm` pone el foco en el input, y robárselo
	 * dejaría a quien navega con teclado fuera de la partida. Ese cambio lo
	 * anuncia la región de abajo.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: se depende de stepIndex a propósito para mover el foco al cambiar de paso, aunque el cuerpo no lo lea
	useEffect(() => {
		if (isPlaying) return;
		headingRef.current?.focus();
	}, [stepIndex, isPlaying]);

	const announcement = isPlaying
		? `${TUTORIAL_TEXTS.stepLabel(stepIndex + 1, TUTORIAL_STEPS.length)}: ${step.title}`
		: "";

	function goNext() {
		if (stepIndex < LAST_STEP_INDEX) {
			setStepIndex(stepIndex + 1);
			return;
		}
		onClose();
	}

	function goBack() {
		if (stepIndex > 0) setStepIndex(stepIndex - 1);
	}

	return (
		<Modal
			isOpen
			onClose={onClose}
			isDismissable={false}
			ariaLabelledby={HEADING_ID}
			fillViewport={isPlaying}
			className={isPlaying ? PLAYING_DIALOG_CLASSES : STEP_DIALOG_CLASSES}
		>
			{/* Jugando, cada nivel entre el diálogo y la partida lleva `min-h-0`:
			    sin él, un hijo de un `flex` en columna no encoge por debajo de su
			    contenido, y en pantallas bajas la partida desbordaría el diálogo
			    en vez de ajustarse a lo que queda (ver `TutorialPlayStep`). */}
			<div className={`flex flex-col ${isPlaying ? "min-h-0 gap-2" : "gap-4"}`}>
				{/* `min-h-10` = el alto de "Saltar tutorial": en el último paso,
				    sin el botón, la cabecera no encoge ni el texto de debajo sube. */}
				<header
					className={`flex min-h-10 justify-between gap-3 ${isPlaying ? "items-center" : "items-start"}`}
				>
					{/* `tabIndex={-1}` solo para poder enfocarlo al cambiar de paso;
					    no entra en el orden de tabulación. El contador va dentro del
					    encabezado y no en un elemento aparte para que se anuncie de
					    una sola vez al recibir el foco.
					    Jugando se oculta a la vista (no al lector: sigue nombrando
					    el diálogo, y la región de abajo anuncia el paso): el hueco
					    es para la partida, que ya lleva su propio encabezado con el
					    continente (D090). */}
					<h2
						id={HEADING_ID}
						ref={headingRef}
						tabIndex={-1}
						className={
							isPlaying
								? "sr-only"
								: "m-0 min-w-0 text-base font-bold text-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:text-lg"
						}
					>
						<span className="block text-xs font-bold text-text-placeholder">
							{TUTORIAL_TEXTS.stepLabel(stepIndex + 1, TUTORIAL_STEPS.length)}
						</span>
						{step.title}
					</h2>

					{/* El único sitio del recorrido que dice que la partida es de
					    ejemplo y que no cuenta (D092), visible todo el rato que se
					    juega. Aviso propio y no `FeedbackMessage`: sus dos
					    variantes son "acierto" y "error", y esto no es ninguna de
					    las dos. El significado va en el texto, sin icono — el ámbar
					    sobre su fondo suave (2,78:1) no llegaría al 3:1 que
					    necesita un icono informativo. Texto en `surface-soft` sobre
					    `warning-soft`: contraste de sobra. */}
					{isPlaying && (
						<p className="m-0 min-w-0 flex-1 rounded-[var(--radius)] border border-warning-border bg-warning-soft px-3 py-2 text-xs font-bold text-surface-soft">
							{TUTORIAL_TEXTS.demoBanner}
						</p>
					)}

					{stepIndex !== LAST_STEP_INDEX && (
						<Button
							variant="text"
							color="danger"
							type="button"
							fullWidth={false}
							onClick={onClose}
						>
							{TUTORIAL_TEXTS.skip}
						</Button>
					)}
				</header>

				<div
					// Cambia con el paso para que la entrada se rehaga; el bloque
					// global de `prefers-reduced-motion` de `global.css` la reduce a
					// 0,01 ms sin que haga falta nada aquí.
					key={step.id}
					className={`flex flex-col gap-4 duration-200 animate-in fade-in-0 ${isPlaying ? "min-h-0" : ""}`}
				>
					{/* Mientras se juega, el texto del paso estorba: la partida ya
					    trae su propia pregunta y su encabezado. */}
					{!isPlaying && (
						<div className="flex flex-col gap-2 text-sm text-surface-soft [&_p]:m-0">
							{step.body}
						</div>
					)}

					{step.kind === "mode" && (
						<TutorialModeChoice mode={previewMode} onChange={setPreviewMode} />
					)}

					{step.kind === "practice-settings" && (
						<TutorialSettings
							configuration={sandbox.state.configuration}
							onChange={sandbox.configure}
						/>
					)}

					{step.kind === "play" && (
						<TutorialPlayStep
							isPlaying={isPlaying}
							hasPlayed={hasPlayed}
							onStart={sandbox.start}
							runtime={sandbox.runtime}
						/>
					)}
				</div>

				{/* Mientras se juega manda la partida: sus propios controles
				    ("Comprobar", "Saltar", "Salir") y nada más, salvo el aviso
				    y "Saltar tutorial", que siguen arriba. */}
				{!isPlaying && (
					<footer className="flex gap-2">
						<Button
							variant="outline"
							color="neutral"
							type="button"
							disabled={stepIndex === 0}
							onClick={goBack}
						>
							{TUTORIAL_TEXTS.back}
						</Button>
						<Button type="button" onClick={goNext}>
							{stepIndex === LAST_STEP_INDEX
								? TUTORIAL_TEXTS.finish
								: TUTORIAL_TEXTS.next}
						</Button>
					</footer>
				)}
			</div>

			<p role="status" aria-live="polite" className="sr-only">
				{announcement}
			</p>
		</Modal>
	);
}

interface TutorialPlayStepProps {
	isPlaying: boolean;
	hasPlayed: boolean;
	onStart: () => void;
	runtime: ReturnType<typeof useSandboxRuntime>["runtime"];
}

/**
 * El paso de la partida: antes de empezar, mientras se juega y después.
 *
 * `CountriesPractice` necesita un alto definido para repartir su tablero y su
 * formulario (por dentro es `flex` con `min-h-0 flex-1`), así que el hueco lo
 * fija este contenedor, y jugando mide lo mismo que en una partida normal
 * (D090). En `FlagGame`, su `<section>` es `h-[min(100%,45rem)]
 * md:h-[min(100%,50rem)]` del alto de `<main>`; aquí se le da **ese mismo
 * tope** (`h-[45rem] md:h-[50rem]`: si cambia allí, hay que cambiarlo aquí) y
 * se deja encoger (`min-h-0`) cuando no cabe. El diálogo tiene de máximo el
 * viewport y, con los `min-h-0` de más arriba, la partida se queda con lo que
 * dejan el padding y la cabecera, sin desbordar. Si aun así algo no cupiera,
 * el diálogo hace scroll: `Modal` lleva barra propia.
 */
function TutorialPlayStep({
	isPlaying,
	hasPlayed,
	onStart,
	runtime,
}: TutorialPlayStepProps) {
	if (isPlaying) {
		return (
			<div className="flex h-[45rem] min-h-0 justify-center md:h-[50rem]">
				<CountriesPractice
					runtime={runtime}
					exitDescription={TUTORIAL_TEXTS.demoExitDescription}
				/>
			</div>
		);
	}

	if (hasPlayed) {
		return (
			<div className="flex flex-col gap-3">
				<FeedbackMessage variant="success" size="sm" role="status">
					{TUTORIAL_TEXTS.demoFinished}
				</FeedbackMessage>
				<Button
					type="button"
					variant="outline"
					color="neutral"
					onClick={onStart}
				>
					{TUTORIAL_TEXTS.demoReplay}
				</Button>
			</div>
		);
	}

	// Sin partida y sin resultado: o todavía no empezó, o se abandonó con
	// "Salir". En los dos casos lo que toca es poder (volver a) jugarla.
	return (
		<Button type="button" onClick={onStart}>
			{TUTORIAL_TEXTS.startDemo}
		</Button>
	);
}
