import { Select as HeroSelect, Label, ListBox } from "@heroui/react";

export interface SelectOption {
	value: string;
	label: string;
}

interface SelectProps {
	options: SelectOption[];
	value: string;
	onChange: (value: string) => void;
	label?: string;
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
	"aria-label": ariaLabel,
	id,
	className,
}: SelectProps) {
	return (
		<HeroSelect
			id={id}
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
			<HeroSelect.Popover>
				<ListBox>
					{options.map((option) => (
						<ListBox.Item
							key={option.value}
							id={option.value}
							textValue={option.label}
						>
							{option.label}
						</ListBox.Item>
					))}
				</ListBox>
			</HeroSelect.Popover>
		</HeroSelect>
	);
}
