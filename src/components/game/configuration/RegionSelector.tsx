import { Fieldset } from "@/components/ui/Fieldset";
import { countries } from "@/data/countries";
import {
	type GameMode,
	type PracticeRegion,
	type PracticeScope,
	REGION_LABELS,
	REGIONS,
	type Region,
} from "@/types/country";
import {
	calculateRegionAverage,
	calculateWorldAverage,
	formatElapsedTime,
} from "@/utils/learning-storage";
import { REGION_COUNTRY_COUNTS } from "@/utils/region-stats";
import { RegionOption } from "./RegionOption";

interface RegionSelectorProps {
	scope: PracticeScope;
	onScopeChange: (scope: PracticeScope) => void;
	regionGameScores: Partial<Record<Region, number[]>>;
	regionBestTimes: Partial<Record<PracticeRegion, number>>;
	/**
	 * Mejor tiempo de "Todo el mundo" con la regla vigente del juego (D076).
	 * Va aparte porque su clave en `regionBestTimes` depende del juego: el
	 * `world` de ahí dentro puede ser una marca de la regla vieja.
	 */
	worldBestTime: number | undefined;
	mode: GameMode;
	getRegionPracticeProgress: (region: Region) => {
		practiced: number;
		total: number;
	};
	/** Carga inicial del progreso (D042). */
	isLoading?: boolean;
}

function getPracticedLabel(
	practiced: number,
	total: number,
): string | undefined {
	if (practiced === 0) return undefined;
	if (practiced >= total) return "Practicado hoy";
	return `${practiced}/${total} hoy`;
}

export function RegionSelector({
	scope,
	onScopeChange,
	regionGameScores,
	regionBestTimes,
	worldBestTime,
	mode,
	getRegionPracticeProgress,
	isLoading = false,
}: RegionSelectorProps) {
	const isWorldSelected = scope.type === "world";
	const selectedRegions = scope.type === "custom" ? scope.regions : [];
	const customCodes = scope.type === "custom" ? scope.countryCodes : [];

	// Mientras carga, `scope` y `mode` son los por defecto, no los del
	// usuario: ninguna tarjeta se pinta marcada (el alcance por defecto es
	// "Todo el mundo" y parecería ya elegido), y se reserva la línea de
	// "Practicado hoy" del modo práctica — el modo del que vuelve cada día
	// y tiene progreso que esperar. Si al final es competitivo, las
	// tarjetas se acortan esa línea una vez (D042).
	const showPracticedLine = isLoading || mode === "practice";

	function toggleWorld() {
		onScopeChange(
			isWorldSelected
				? { type: "custom", regions: [], countryCodes: [] }
				: { type: "world" },
		);
	}

	function toggleRegion(region: Region) {
		const isSelected = selectedRegions.includes(region);
		onScopeChange({
			type: "custom",
			regions: isSelected
				? selectedRegions.filter((selected) => selected !== region)
				: [...selectedRegions, region],
			countryCodes: customCodes,
		});
	}

	// El grid va a su alto natural y el scroll lo hace la sección entera
	// (`Configuration`). Antes intentaba ser él el único que scrolleaba
	// (`flex-1 min-h-0` en el fieldset + `overflow-y-auto` aquí), pero en
	// Chromium eso nunca funcionó: el contenido de un <fieldset> vive en una
	// caja anónima que no hereda el alto flexible del fieldset, así que el
	// fieldset se encogía y el grid seguía midiendo lo mismo, desbordándose
	// por debajo de los botones sin forma de alcanzarlo.
	return (
		<Fieldset
			legend="Continentes"
			className="
				min-w-0
				m-0
				flex flex-col
				gap-3
			"
		>
			<div
				className="
					grid
					grid-cols-2
					gap-3
					px-1
					py-1.5
					min-[44rem]:grid-cols-3
				"
			>
				<RegionOption
					value="world"
					label="Todo el mundo"
					countryCount={countries.length}
					score={
						mode === "practice" ? calculateWorldAverage(regionGameScores) : null
					}
					scoreTooltipLabel="Media de tus continentes, ponderada por número de países"
					bestTimeLabel={
						mode === "competitive" && worldBestTime !== undefined
							? formatElapsedTime(worldBestTime)
							: null
					}
					checked={!isLoading && isWorldSelected}
					onChange={toggleWorld}
					showPracticedLine={showPracticedLine}
					isLoading={isLoading}
					className="col-span-2 min-[44rem]:col-span-1"
				/>

				{REGIONS.map((region) => {
					const progress =
						mode === "practice"
							? getRegionPracticeProgress(region)
							: { practiced: 0, total: 0 };
					const bestTime = regionBestTimes[region];

					return (
						<RegionOption
							key={region}
							value={region}
							label={REGION_LABELS[region]}
							countryCount={REGION_COUNTRY_COUNTS[region]}
							score={
								mode === "practice"
									? calculateRegionAverage(regionGameScores[region])
									: null
							}
							bestTimeLabel={
								mode === "competitive" && bestTime !== undefined
									? formatElapsedTime(bestTime)
									: null
							}
							checked={
								!isLoading &&
								!isWorldSelected &&
								selectedRegions.includes(region)
							}
							onChange={() => toggleRegion(region)}
							practicedLabel={getPracticedLabel(
								progress.practiced,
								progress.total,
							)}
							showPracticedLine={showPracticedLine}
							isLoading={isLoading}
						/>
					);
				})}
			</div>
		</Fieldset>
	);
}
