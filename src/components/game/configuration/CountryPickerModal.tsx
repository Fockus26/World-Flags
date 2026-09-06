import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { countries } from "@/data/countries";
import { REGION_LABELS, REGIONS } from "@/types/country";

interface CountryPickerModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialSelectedCodes: string[];
	onConfirm: (countryCodes: string[]) => void;
}

const spanishCollator = new Intl.Collator("es", { sensitivity: "base" });

export function CountryPickerModal({
	isOpen,
	onClose,
	initialSelectedCodes,
	onConfirm,
}: CountryPickerModalProps) {
	const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelectedCodes));

	// biome-ignore lint/correctness/useExhaustiveDependencies: solo se resetea al abrir, no en cada cambio de la selección inicial
	useEffect(() => {
		if (isOpen) {
			setSelected(new Set(initialSelectedCodes));
		}
	}, [isOpen]);

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

			<div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
				{REGIONS.map((region) => {
					const regionCountries = countries
						.filter((country) => country.region === region)
						.sort((first, second) => spanishCollator.compare(first.name, second.name));
					const regionCodes = regionCountries.map((country) => country.code);
					const allSelected = regionCodes.every((code) => selected.has(code));

					return (
						<section key={region}>
							<div className="mb-1.5 flex items-center justify-between gap-2">
								<h3 className="m-0 text-[0.85rem] font-extrabold text-surface-soft">
									{REGION_LABELS[region]}
								</h3>
								<button
									type="button"
									className="cursor-pointer border-0 bg-transparent p-0 text-[0.75rem] font-bold text-secondary"
									onClick={() => toggleAllInRegion(regionCodes, allSelected)}
								>
									{allSelected ? "Ninguno" : "Todos"}
								</button>
							</div>

							<div className="grid grid-cols-2 gap-x-3 gap-y-1 min-[30rem]:grid-cols-3">
								{regionCountries.map((country) => (
									<label
										key={country.code}
										className="flex min-w-0 cursor-pointer items-center gap-1.5 text-[0.82rem]"
									>
										<input
											type="checkbox"
											checked={selected.has(country.code)}
											onChange={() => toggleCountry(country.code)}
											className="shrink-0"
										/>
										<span className="truncate">{country.name}</span>
									</label>
								))}
							</div>
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
