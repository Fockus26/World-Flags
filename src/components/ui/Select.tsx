import { Select as HeroSelect, Label, ListBox } from "@heroui/react";
import { POPOVER_MOTION_CLASS } from "./popover-motion";

export interface SelectOption {
	value: string;
	label: string;
}

interface SelectProps {
	options: SelectOption[];
	value: string;
	onChange: (value: string) => void;
	label?: string;
	/** Qué se lee cuando `value` no es ninguna opción. Sin esto, HeroUI pone su texto en inglés. */
	placeholder?: string;
	"aria-label"?: string;
	id?: string;
	className?: string;
}

/**
 * Select accesible sobre HeroUI v3 (React Aria): teclado, `role="listbox"`,
 * `aria-activedescendant` y cierre al hacer clic fuera vienen incluidos —
 * reemplaza al combobox casero anterior.
 */
export function Select({
	options,
	value,
	onChange,
	label,
	placeholder,
	"aria-label": ariaLabel,
	id,
	className,
}: SelectProps) {
	return (
		<HeroSelect
			id={id}
			placeholder={placeholder}
			selectedKey={value}
			onSelectionChange={(key) => onChange(String(key))}
			aria-label={label ? undefined : ariaLabel}
			className={["flex w-full flex-col gap-1.5", className ?? ""]
				.filter(Boolean)
				.join(" ")}
		>
			{label ? <Label>{label}</Label> : null}
			<HeroSelect.Trigger>
				<HeroSelect.Value />
				<HeroSelect.Indicator />
			</HeroSelect.Trigger>
			{/* Apertura y cierre más visibles que los de serie (D099). */}
			<HeroSelect.Popover className={POPOVER_MOTION_CLASS}>
				<ListBox>
					{options.map((option) => (
						<ListBox.Item
							key={option.value}
							id={option.value}
							textValue={option.label}
							// 44 px: objetivo táctil mínimo del kit en móvil.
							className="min-h-11"
						>
							{option.label}
							{/* La marca de la opción elegida: sin ella solo se distinguía con el foco del teclado. */}
							<ListBox.ItemIndicator />
						</ListBox.Item>
					))}
				</ListBox>
			</HeroSelect.Popover>
		</HeroSelect>
	);
}
