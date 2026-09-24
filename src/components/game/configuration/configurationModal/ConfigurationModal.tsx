import { Tabs } from "@heroui/react";
import { useCallback, useRef, useState } from "react";
import { ReleaseNotesModal } from "@/components/app/ReleaseNotesModal";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { APP_VERSION } from "@/data/changelog";
import type {
	Difficulty,
	GameMode,
	PracticeOrder,
	TimerDuration,
} from "@/types/country";
import type { UserProfile } from "@/types/progress";
import { AccountTab } from "./AccountTab";
import { GameTab } from "./GameTab";

type ConfigurationModalTab = "account" | "game";

interface ConfigurationModalProps {
	isOpen: boolean;
	onClose: () => void;
	profile: UserProfile;
	onSaveProfile: (profile: UserProfile) => void;
	mode: GameMode;
	onModeChange: (mode: GameMode) => void;
	order: PracticeOrder;
	onOrderChange: (order: PracticeOrder) => void;
	timerDuration: TimerDuration;
	onTimerDurationChange: (duration: TimerDuration) => void;
	timerEnabled: boolean;
	onTimerEnabledChange: (enabled: boolean) => void;
	difficulty: Difficulty;
	onDifficultyChange: (difficulty: Difficulty) => void;
	/**
	 * Reabre la partida guiada (D071). Este modal **no** se cierra: el recorrido
	 * se monta encima, como "Novedades", para que al cerrarlo el foco vuelva al
	 * botón que lo abrió.
	 */
	onOpenTutorial: () => void;
}

export function ConfigurationModal({
	isOpen,
	onClose,
	profile,
	onSaveProfile,
	mode,
	onModeChange,
	order,
	onOrderChange,
	timerDuration,
	onTimerDurationChange,
	timerEnabled,
	onTimerEnabledChange,
	difficulty,
	onDifficultyChange,
	onOpenTutorial,
}: ConfigurationModalProps) {
	const [activeTab, setActiveTab] = useState<ConfigurationModalTab>("account");
	const [panelsHeight, setPanelsHeight] = useState<number>();
	const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);

	// Se lee dentro del callback de más abajo para saber si el panel que se
	// acaba de (re)montar es el que está activo — un `useState` normal
	// serviría también, pero esto evita crear una nueva función (y por lo
	// tanto desconectar/reconectar el observer) cada vez que cambia `activeTab`.
	const activeTabRef = useRef(activeTab);
	activeTabRef.current = activeTab;

	// Las dos pestañas tienen alto muy distinto (Usuario vs. Juego, y Juego
	// además cambia de alto solo con el modo). Antes cada `Tabs.Panel`
	// quedaba en flujo normal, así que el cambio de pestaña resultaba en un
	// salto de alto instantáneo del contenedor. Ahora las dos ranuras están
	// posicionadas una sobre otra (para el fundido cruzado real de abajo) y
	// se mide con `ResizeObserver` cuál está activa para animar el
	// contenedor hacia ese alto — el mismo truco que documenta
	// `CURRENT_PHASE.md` para esto (no hay `interpolate-size` fiable en
	// este motor, y framer-motion no corre aquí, ver D006).
	//
	// Por qué un `ref` de callback y no un `useLayoutEffect([activeTab])`:
	// `Tabs.Panel` hace un render interno extra al montar para poblar su
	// colección (comentario de react-aria: "after extra render to populate
	// the collection") — con un efecto atado a `activeTab`, la pestaña que
	// queda seleccionada *por defecto* (la primera vez que se abre el
	// modal, sin que `activeTab` haya cambiado todavía) se podía medir
	// contra un nodo de esa pasada intermedia y quedarse en 0 para
	// siempre, dejando ese contenido recortado por el `overflow-hidden`
	// hasta el primer clic de pestaña. El `ref` de callback se dispara
	// exactamente cuando React conecta el nodo real, sea cual sea esa
	// pasada — sin depender de que `activeTab` cambie para volver a intentar.
	// Dos funciones separadas (no una fábrica llamada con "account"/"game" al
	// vuelo): un `ref` de callback necesita **identidad estable** entre
	// renders — si se recreara en cada render, React lo trataría como un
	// `ref` distinto cada vez y desconectaría/reconectaría el
	// `ResizeObserver` sin necesidad en cada re-render del modal.
	const observeAccountPanel = useCallback((node: HTMLDivElement | null) => {
		if (!node) return undefined;

		const measure = () => {
			if (activeTabRef.current === "account") {
				setPanelsHeight(node.getBoundingClientRect().height);
			}
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	const observeGamePanel = useCallback((node: HTMLDivElement | null) => {
		if (!node) return undefined;

		const measure = () => {
			if (activeTabRef.current === "game") {
				setPanelsHeight(node.getBoundingClientRect().height);
			}
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			className="w-[min(30rem,92vw)] text-left"
			ariaLabelledby="user-modal-title"
		>
			<header className="mb-3 flex items-center justify-between">
				<h2 id="user-modal-title">Perfil y configuración</h2>
				<ModalCloseButton onClose={onClose} />
			</header>

			<Tabs
				selectedKey={activeTab}
				onSelectionChange={(key) => setActiveTab(key as ConfigurationModalTab)}
			>
				<Tabs.List aria-label="Secciones" className="mb-4">
					<Tabs.Tab id="account">Usuario</Tabs.Tab>
					<Tabs.Tab id="game">Juego</Tabs.Tab>
				</Tabs.List>

				{/*
					`relative` + alto fijado por JS: las dos ranuras de abajo son
					`absolute inset-x-0 top-0`, así que sin esto el contenedor no
					tendría alto propio (los hijos absolutos no lo generan) y las
					pestañas se verían encimadas en vez de una debajo de la otra.
				*/}
				<div
					className="relative overflow-hidden transition-[height] duration-300 ease-in-out"
					style={{ height: panelsHeight }}
				>
					{/*
						HeroUI tipa `Tabs.Panel`'s `className` como `string` a secas
						(no acepta la función de render-props que sí admite el
						`TabPanel` de react-aria-components por debajo), así que en
						vez de leer `isEntering`/`isExiting` por función se leen los
						`data-entering`/`data-exiting` que ese mismo componente ya
						pone en el DOM — react-aria mantiene montado el panel
						saliente mientras dura su animación de salida (por eso hace
						falta `data-[exiting]:` y no alcanza con un simple
						`{condición && ...}`). Las dos ranuras quedan una encima de
						la otra (no una debajo de otra) para que el fundido sea
						cruzado de verdad, no una que empuja a la otra.
					*/}
					<Tabs.Panel
						id="account"
						ref={observeAccountPanel}
						className="absolute inset-x-0 top-0 flex flex-col gap-4 duration-200 data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:slide-in-from-left-2 data-[exiting]:animate-out data-[exiting]:fade-out-0"
					>
						<AccountTab profile={profile} onSaveProfile={onSaveProfile} />
					</Tabs.Panel>

					<Tabs.Panel
						id="game"
						ref={observeGamePanel}
						className="absolute inset-x-0 top-0 flex flex-col gap-4 duration-200 data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:slide-in-from-right-2 data-[exiting]:animate-out data-[exiting]:fade-out-0"
					>
						<GameTab
							mode={mode}
							onModeChange={onModeChange}
							order={order}
							onOrderChange={onOrderChange}
							timerDuration={timerDuration}
							onTimerDurationChange={onTimerDurationChange}
							timerEnabled={timerEnabled}
							onTimerEnabledChange={onTimerEnabledChange}
							difficulty={difficulty}
							onDifficultyChange={onDifficultyChange}
						/>
					</Tabs.Panel>
				</div>
			</Tabs>

			{/* Versión, tutorial y novedades (D059, D071): aquí y no como cuarto
			    icono junto a 🏅 🏆 📍, cuya fila a 320 px ya va justa. Fuera de
			    las pestañas, así se ve en las dos y no entra en la medición de
			    alto de arriba. `flex-wrap`: con tres cosas en vez de dos, en las
			    pantallas más estrechas los botones bajan a su propia línea en
			    lugar de empujar.
			    ⚠️ Copy provisional (`CONTENT_CHECKLIST.md` #20 y #25). */}
			<footer className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-surface-border pt-3">
				<p className="text-xs">Versión {APP_VERSION}</p>
				{/* También envuelve por dentro: a 320 px los dos botones juntos
				    miden 285 px en 259 px de pie (medido), así que sin esto se
				    salían. Al envolver, se apilan alineados a la derecha. */}
				<div className="flex flex-wrap items-center justify-end gap-1">
					<Button
						variant="text"
						color="neutral"
						type="button"
						fullWidth={false}
						onClick={onOpenTutorial}
					>
						Cómo se juega
					</Button>
					<Button
						variant="text"
						color="neutral"
						type="button"
						fullWidth={false}
						onClick={() => setIsReleaseNotesOpen(true)}
					>
						Novedades
					</Button>
				</div>
			</footer>

			<ReleaseNotesModal
				isOpen={isReleaseNotesOpen}
				onClose={() => setIsReleaseNotesOpen(false)}
			/>
		</Modal>
	);
}
