import type { ReactNode } from "react";

interface OptionTileProps {
	name: string;
	value: string;
	checked: boolean;
	onChange: () => void;
	children: ReactNode;
}

export function OptionTile({ name, value, checked, onChange, children }: OptionTileProps) {
	return (
		<label
			className="
				relative flex min-h-11.5 w-full min-w-0
				cursor-pointer items-center justify-center
				rounded-md border border-border-lighter
				bg-surface
				transition-[border-color,background-color,box-shadow,transform]
				duration-180 ease-in-out
				hover:-translate-y-px
				hover:border-border-primary-hover
				hover:bg-primary-soft
				hover:shadow-(--shadow-secondary)
				has-checked:border-primary
				has-checked:bg-primary-soft
				has-checked:shadow-(--shadow-primary-outline)
				has-focus-visible:outline-(--focus-option)
				has-focus-visible:outline-offset-2
				max-[30rem]:min-h-10
			"
		>
			<input
				type="radio"
				name={name}
				value={value}
				checked={checked}
				onChange={onChange}
				className="pointer-events-none absolute size-px opacity-0"
			/>
			<span className="px-3 py-2.5 text-sm font-bold max-[30rem]:px-2 max-[30rem]:py-2 max-[30rem]:text-xs">
				{children}
			</span>
		</label>
	);
}
