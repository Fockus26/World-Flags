import { NavArrowDown } from "iconoir-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { countries } from "@/data/countries";
import { REGION_LABELS, REGIONS, type Region } from "@/types/country";

interface CountryPickerModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialSelectedCodes: string[];
	onConfirm: (countryCodes: string[]) => void;
}

const spanishCollator = new Intl.Collator("es", { sensitivity: "base" });

const countriesByRegion = REGIONS.reduce(
	(map, region) => {
		map[region] = countries
			.filter((country) => country.region === region)
			.sort((first, second) => spanishCollator.compare(first.name, second.name));
		return map;
	},
	{} as Record<Region, typeof countries>,
);

interface CountryCheckboxProps {
	label: string;
	checked: boolean;
	onChange: () => void;
}

function CountryCheckbox({ label, checked, onChange }: CountryCheckboxProps) {
	return (
		<label className="relative flex min-w-0 cursor-pointer items-center gap-1.5 py-0.5 text-[0.82rem]">
			<input
				type="checkbox"
				checked={checked}
				onChange={onChange}
				className="peer absolute size-px opacity-0"
			/>
			<span
				aria-hidden="true"
				className="relative flex size-4 shrink-0 items-center justify-center rounded-[0.25rem] border-2 border-neutral-border bg-surface transition-colors duration-150 after:text-[0.65rem] after:leading-none after:font-black after:text-secondary-soft after:opacity-0 after:content-['✓'] peer-checked:border-secondary peer-checked:bg-secondary peer-checked:after:opacity-100"
			/>
			<span className="truncate">{label}</span>
		</label>
	);
}

export function CountryPickerModal({
	isOpen,
	onClose,
	initialSelectedCodes,
	onConfirm,
}: CountryPickerModalProps) {
	const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelectedCodes));
	const [expandedRegions, setExpandedRegions] = useState<Set<Region>>(new Set());

	// biome-ignore lint/correctness/useExhaustiveDependencies: solo se resetea al abrir, no en cada cambio de la selección inicial
	useEffect(() => {
		if (!isOpen) return;
		const initialSet = new Set(initialSelectedCodes);
		setSelected(initialSet);
		// Se abren de entrada los continentes que ya tienen algo elegido.
		setExpandedRegions(
			new Set(REGIONS.filter((region) => countriesByRegion[region].some((c) => initialSet.has(c.code)))),
		);
	}, [isOpen]);

	function toggleRegionExpanded(region: Region) {
		setExpandedRegions((current) => {
			const next = new Set(current);
			if (next.has(region)) {
				next.delete(region);
			} else {
				next.add(region);
			}
			return next;
		});
	}

	function toggleCountry(code: string) {
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(code)) {
				next.delete(code);
			} else {
				next.add(code);
			}
			return next;
		});
	}

	function toggleAllInRegion(regionCodes: string[], allSelected: boolean) {
		setSelected((current) => {
			const next = new Set(current);
			for (const code of regionCodes) {
				if (allSelected) {
					next.delete(code);
				} else {
					next.add(code);
				}
			}
			return next;
		});
	}

	function handleConfirm() {
		onConfirm([...selected]);
		onClose();
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			className="w-[min(34rem,92vw)] text-left"
			ariaLabelledby="country-picker-title"
		>
			<header className="mb-3 flex items-center justify-between gap-3">
				<h2 id="country-picker-title" className="m-0">
					Elegir países
				</h2>
				<Button variant="text" color="danger" type="button" onClick={onClose}>
					Cerrar
				</Button>
			</header>

			<p className="mt-0 mb-3 text-[0.85rem] text-text-placeholder">
				Elige los países que quieres practicar. Cuentan como práctica solo ellos, no todo el
				continente.
			</p>

			<div className="flex max-h-[55vh] flex-col gap-1.5 overflow-y-auto pr-1">
				{REGIONS.map((region) => {
					const regionCountries = countriesByRegion[region];
					const regionCodes = regionCountries.map((country) => country.code);
					const selectedCount = regionCodes.filter((code) => selected.has(code)).length;
					const allSelected = selectedCount === regionCodes.length;
					const isExpanded = expandedRegions.has(region);

					return (
						<section
							key={region}
							className="overflow-hidden rounded-md border border-surface-border"
						>
							<div className="flex items-center gap-2 bg-surface-hover px-2.5 py-2">
								<button
									type="button"
									onClick={() => toggleRegionExpanded(region)}
									aria-expanded={isExpanded}
									className="flex flex-1 min-w-0 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left"
								>
									<NavArrowDown
										className={`size-4 shrink-0 text-text-placeholder transition-transform duration-150 ${isExpanded ? "rotate-0" : "-rotate-90"}`}
										aria-hidden="true"
									/>
									<span className="truncate text-[0.85rem] font-extrabold text-surface-soft">
										{REGION_LABELS[region]}
									</span>
									<span className="shrink-0 text-[0.72rem] text-text-placeholder">
										{selectedCount > 0 ? `${selectedCount}/${regionCodes.length}` : regionCodes.length}
									</span>
								</button>
								<button
									type="button"
									className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[0.72rem] font-bold text-secondary"
									onClick={() => toggleAllInRegion(regionCodes, allSelected)}
								>
									{allSelected ? "Ninguno" : "Todos"}
								</button>
							</div>

							{isExpanded && (
								<div className="grid grid-cols-2 gap-x-3 gap-y-0.5 px-2.5 py-2 min-[30rem]:grid-cols-3">
									{regionCountries.map((country) => (
										<CountryCheckbox
											key={country.code}
											label={country.name}
											checked={selected.has(country.code)}
											onChange={() => toggleCountry(country.code)}
										/>
									))}
								</div>
							)}
						</section>
					);
				})}
			</div>

			<div className="mt-4 grid grid-cols-2 gap-3">
				<Button type="button" color="neutral" onClick={onClose}>
					Cancelar
				</Button>
				<Button type="button" color="primary" onClick={handleConfirm}>
					Usar {selected.size} país{selected.size === 1 ? "" : "es"}
				</Button>
			</div>
		</Modal>
	);
}
