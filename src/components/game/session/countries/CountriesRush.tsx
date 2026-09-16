import { type SubmitEvent, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmationModal } from "@/components/game/session/ConfirmationModal";
import { Header } from "@/components/game/session/Header";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { Input } from "@/components/ui/Input";
import { useFlyToSlot } from "@/hooks/useFlyToSlot";
import { useGame } from "@/hooks/useGame";
import { buildBoard, findMatch } from "@/utils/country-board";
import { focusWhenVisible } from "@/utils/focus";
import { getScopeLabel } from "@/utils/practice-scope";
import type { BoardSlotState } from "./BoardSlot";
import { CountryBoard } from "./CountryBoard";

// D031: si el texto coincide con un país y ADEMÁS es prefijo de otro país sin
// descubrir, se espera este plazo antes de aceptarlo — Enter lo acepta ya.
const AMBIGUOUS_ACCEPT_DELAY_MS = 700;

/**
 * Rush de países (D031-D033): escribir todos los países del alcance, en
 * cualquier orden, contra reloj. Cada acierto se acepta solo mientras se
 * escribe (sin botón "Comprobar") y "vuela" a su hueco en el tablero.
 */
export function CountriesRush() {
	const { activeGame, exitGame, finishGame, attemptCountry, attemptCountries } =
		useGame();

	const countries = useMemo(
		() => activeGame?.countries ?? [],
		[activeGame?.countries],
	);
	const totalCount = countries.length;
	const board = useMemo(() => buildBoard(countries), [countries]);

	const [stateByCode, setStateByCode] = useState<
		Record<string, BoardSlotState>
	>({});
	const [flyingCodes, setFlyingCodes] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const [inputValue, setInputValue] = useState("");
	const [feedback, setFeedback] = useState<string | null>(null);
	const [announcement, setAnnouncement] = useState("");
	const [isExitModalOpen, setIsExitModalOpen] = useState(false);
	const [isSurrenderModalOpen, setIsSurrenderModalOpen] = useState(false);
	const [hasSurrendered, setHasSurrendered] = useState(false);
	const [elapsedMs, setElapsedMs] = useState(0);

	const inputRef = useRef<HTMLInputElement>(null);
	const seeResultsButtonRef = useRef<HTMLButtonElement>(null);
	const slotRefs = useRef<Map<string, HTMLLIElement>>(new Map());
	const startTimeRef = useRef<number | null>(null);
	const isClockPausedRef = useRef(false);
	// Un solo ref: los dos modales (salir/rendirse) nunca están abiertos a la vez.
	const modalOpenedAtRef = useRef<number | null>(null);
	const ambiguousTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	// Evita aceptar dos veces el mismo país (doble disparo del `onChange`,
	// timeout ambiguo que vence justo cuando también se pulsa Enter…), mismo
	// espíritu que el guard de doble-submit de `Session.tsx`.
	const acceptedCodesRef = useRef<Set<string>>(new Set());

	const { fly } = useFlyToSlot(slotRefs);

	// El reloj corre desde que se monta la sesión hasta que se completa o se
	// decide ver los resultados tras rendirse (igual que el rush de banderas).
	useEffect(() => {
		if (startTimeRef.current === null) {
			startTimeRef.current = Date.now();
		}
	}, []);

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			if (startTimeRef.current !== null && !isClockPausedRef.current) {
				setElapsedMs(Date.now() - startTimeRef.current);
			}
		}, 100);
		return () => window.clearInterval(intervalId);
	}, []);

	useEffect(() => {
		return () => clearTimeout(ambiguousTimeoutRef.current);
	}, []);

	// El foco vuelve siempre al input salvo que haya un modal abierto o ya se
	// haya rendido (ahí el input queda deshabilitado/oculto).
	useEffect(() => {
		if (!isExitModalOpen && !isSurrenderModalOpen && !hasSurrendered) {
			focusWhenVisible(inputRef.current);
		}
	}, [isExitModalOpen, isSurrenderModalOpen, hasSurrendered]);

	// Al rendirse, el foco va al botón "Ver resultados" — es lo único
	// accionable que queda en pantalla.
	useEffect(() => {
		if (hasSurrendered) {
			focusWhenVisible(seeResultsButtonRef.current);
		}
	}, [hasSurrendered]);

	if (!activeGame) {
		return null;
	}

	const { configuration } = activeGame;
	const scopeLabel = getScopeLabel(configuration.scope);
	const foundCodes = new Set(
		Object.entries(stateByCode)
			.filter(([, state]) => state !== "hidden")
			.map(([code]) => code),
	);
	const foundCount = acceptedCodesRef.current.size;

	/** Corrige `startTimeRef` por el tiempo que estuvo abierto un modal, sin contarlo para la carrera. */
	function applyModalPauseCorrection() {
		if (modalOpenedAtRef.current !== null) {
			const pausedMs = Date.now() - modalOpenedAtRef.current;
			if (startTimeRef.current !== null) {
				startTimeRef.current += pausedMs;
			}
			modalOpenedAtRef.current = null;
		}
	}

	function handleOpenExitModal() {
		isClockPausedRef.current = true;
		modalOpenedAtRef.current = Date.now();
		setIsExitModalOpen(true);
	}

	function handleCancelExit() {
		applyModalPauseCorrection();
		isClockPausedRef.current = false;
		setIsExitModalOpen(false);
	}

	function handleOpenSurrenderModal() {
		isClockPausedRef.current = true;
		modalOpenedAtRef.current = Date.now();
		setIsSurrenderModalOpen(true);
	}

	function handleCancelSurrender() {
		applyModalPauseCorrection();
		isClockPausedRef.current = false;
		setIsSurrenderModalOpen(false);
	}

	/** D033: al rendirse se revelan los países que faltaban como "missed" y la sesión no se cierra todavía — falta "Ver resultados". */
	function handleConfirmSurrender() {
		applyModalPauseCorrection();
		setIsSurrenderModalOpen(false);

		const missedCountries = countries.filter(
			(country) => !acceptedCodesRef.current.has(country.code),
		);

		setStateByCode((previous) => {
			const next = { ...previous };
			for (const country of missedCountries) {
				next[country.code] = "missed";
			}
			return next;
		});

		// Cada país no encontrado cuenta como fallo para el SRS, igual que un
		// skip en la práctica de banderas — no se aprendió esta vez.
		//
		// `attemptCountries` (plural, `perf/batch-country-attempts`) en vez de
		// llamar a `attemptCountry` en un bucle: en un rush de "Todo el mundo"
		// esto puede ser hasta ~150 países de golpe, y `attemptCountry` uno
		// por uno persistiría en localStorage 150 veces seguidas para un solo
		// evento del usuario (rendirse). `attemptCountries` hace el mismo
		// cálculo pero guarda una sola vez.
		attemptCountries(
			missedCountries.map((country) => country.code),
			false,
			"countries",
		);

		// El reloj se queda pausado a propósito: la carrera terminó aquí, y
		// el tiempo mostrado en "Ver resultados" no debe seguir corriendo.
		setHasSurrendered(true);
	}

	function completeRush() {
		isClockPausedRef.current = true;
		const finalElapsedMs =
			startTimeRef.current !== null
				? Date.now() - startTimeRef.current
				: elapsedMs;

		finishGame({
			mode: "competitive",
			gameType: "countries",
			completed: true,
			scope: configuration.scope,
			totalCountries: totalCount,
			correctAnswers: totalCount,
			skippedAnswers: 0,
			finishedAt: new Date().toISOString(),
			elapsedMs: finalElapsedMs,
		});
	}

	function handleSeeResults() {
		const finalElapsedMs =
			startTimeRef.current !== null
				? Date.now() - startTimeRef.current
				: elapsedMs;

		finishGame({
			mode: "competitive",
			gameType: "countries",
			completed: false,
			scope: configuration.scope,
			totalCountries: totalCount,
			correctAnswers: acceptedCodesRef.current.size,
			skippedAnswers: totalCount - acceptedCodesRef.current.size,
			finishedAt: new Date().toISOString(),
			elapsedMs: finalElapsedMs,
		});
	}

	function acceptMatch(code: string, displayName: string) {
		if (acceptedCodesRef.current.has(code)) return;
		acceptedCodesRef.current.add(code);

		setStateByCode((previous) => ({ ...previous, [code]: "revealed" }));
		setFlyingCodes((previous) => new Set(previous).add(code));
		setInputValue("");
		setFeedback(null);
		setAnnouncement(
			`${displayName}. ${acceptedCodesRef.current.size} de ${totalCount}.`,
		);

		attemptCountry(code, true, "countries");

		const fromEl = inputRef.current;
		if (!fromEl) {
			// Sin input que medir (no debería pasar, está siempre montado):
			// se revela igual, sin animación.
			setFlyingCodes((previous) => {
				const next = new Set(previous);
				next.delete(code);
				return next;
			});
			if (acceptedCodesRef.current.size === totalCount) completeRush();
			return;
		}

		fly({
			text: displayName,
			fromEl,
			toCode: code,
			onLanded: () => {
				setFlyingCodes((previous) => {
					const next = new Set(previous);
					next.delete(code);
					return next;
				});
				// Se completa cuando ATERRIZA el último vuelo, no cuando se
				// escribe la última letra — así el jugador ve el tablero
				// entero lleno antes de pasar a resultados.
				if (acceptedCodesRef.current.size === totalCount) {
					completeRush();
				}
			},
		});
	}

	function handleInputChange(value: string) {
		setInputValue(value);
		setFeedback(null);
		clearTimeout(ambiguousTimeoutRef.current);

		const result = findMatch(value, countries, foundCodes, "hard");

		if (result.kind === "none") {
			return;
		}

		if (result.kind === "alreadyFound") {
			const country = countries.find((c) => c.code === result.code);
			setFeedback(`Ya tienes ${country?.name ?? ""}`);
			return;
		}

		const country = countries.find((c) => c.code === result.code);
		if (!country) return;

		if (result.ambiguousPrefix) {
			ambiguousTimeoutRef.current = setTimeout(() => {
				acceptMatch(result.code, country.name);
			}, AMBIGUOUS_ACCEPT_DELAY_MS);
			return;
		}

		acceptMatch(result.code, country.name);
	}

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmed = inputValue.trim();
		if (!trimmed) return;

		clearTimeout(ambiguousTimeoutRef.current);

		const result = findMatch(inputValue, countries, foundCodes, "hard");

		if (result.kind === "none") {
			setFeedback(`"${trimmed}" no es un país de ${scopeLabel}`);
			return;
		}

		const country = countries.find((c) => c.code === result.code);
		if (!country) return;

		if (result.kind === "alreadyFound") {
			setFeedback(`Ya tienes ${country.name}`);
			return;
		}

		// Enter acepta ya, aunque el texto sea prefijo ambiguo (D031).
		acceptMatch(result.code, country.name);
	}

	return (
		<>
			<section className="flex h-[min(100%,45rem)] md:h-[min(100%,50rem)] max-h-full w-[min(100%,58rem)] flex-col overflow-hidden rounded-lg border border-surface-border bg-surface p-[0.85rem] min-[44rem]:rounded-2xl min-[44rem]:p-[clamp(1rem,2.5vh,2rem)]">
				<Header
					regionLabel={scopeLabel}
					// `Header` siempre muestra `currentIndex + 1`: aquí no hay
					// "posición actual" (cualquier país puede escribirse en
					// cualquier orden), así que se resta 1 para que lo que se
					// vea sea `foundCount` tal cual (0 encontrados → "0/N").
					currentIndex={foundCount - 1}
					totalCountries={totalCount}
					elapsedMs={elapsedMs}
					onExit={handleOpenExitModal}
				/>

				<CountryBoard
					className="mt-[0.65rem] min-[30rem]:mt-[clamp(0.75rem,2vh,1.5rem)]"
					groups={board}
					stateByCode={stateByCode}
					flyingCodes={flyingCodes}
					slotRefs={slotRefs}
				/>

				<div role="status" aria-live="polite" className="sr-only">
					{announcement}
				</div>

				{!hasSurrendered ? (
					<form
						className="mt-[0.65rem] grid shrink-0 gap-[0.45rem] min-[30rem]:mt-[clamp(0.75rem,2vh,1.5rem)] min-[43rem]:gap-[0.65rem]"
						onSubmit={handleSubmit}
					>
						<label
							htmlFor="country-rush-input"
							className="font-extrabold text-surface-soft"
						>
							Escribe un país de {scopeLabel}
						</label>

						<Input
							ref={inputRef}
							id="country-rush-input"
							name="answer"
							type="text"
							value={inputValue}
							onChange={(event) => handleInputChange(event.target.value)}
							autoComplete="off"
							spellCheck={false}
							autoCapitalize="none"
							enterKeyHint="done"
						/>

						{feedback && (
							<FeedbackMessage variant="danger" size="sm" role="status">
								{feedback}
							</FeedbackMessage>
						)}

						<Button
							type="button"
							variant="outline"
							color="danger"
							onClick={handleOpenSurrenderModal}
						>
							Rendirme
						</Button>
					</form>
				) : (
					<div className="mt-[0.65rem] grid shrink-0 gap-[0.45rem] min-[30rem]:mt-[clamp(0.75rem,2vh,1.5rem)] min-[43rem]:gap-[0.65rem]">
						<p className="m-0 text-center text-text-placeholder">
							Encontraste {foundCount} de {totalCount}.
						</p>
						<Button
							ref={seeResultsButtonRef}
							type="button"
							color="primary"
							onClick={handleSeeResults}
						>
							Ver resultados
						</Button>
					</div>
				)}
			</section>

			<ConfirmationModal
				isOpen={isExitModalOpen}
				onCancel={handleCancelExit}
				onConfirm={exitGame}
			/>

			<ConfirmationModal
				isOpen={isSurrenderModalOpen}
				onCancel={handleCancelSurrender}
				onConfirm={handleConfirmSurrender}
				title="¿Rendirte?"
				description="Se revelarán los países que faltan. La sesión cuenta igual, pero el mejor tiempo solo se registra si completas el tablero entero."
				confirmLabel="Sí, rendirme"
				cancelLabel="Seguir intentando"
			/>
		</>
	);
}
