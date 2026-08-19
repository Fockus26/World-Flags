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
		<label className="group relative flex w-full min-w-0 cursor-pointer items-center justify-center rounded-md border bg-primary-soft border-primary-border transition-colors duration-180 ease-in-out hover:bg-primary active:bg-primary has-checked:bg-primary has-focus:outline-3 has-focus:outline-offset-3 has-focus:outline-primary-border min-h-10 sm:min-h-11.5">
			<input
				type="radio"
				name={name}
				value={value}
				checked={checked}
				onChange={onChange}
				tabIndex={0}
				className="absolute size-px opacity-0"
			/>
			<span className="px-2 py-2 text-primary group-hover:text-primary-soft group-active:text-primary-soft group-has-checked:text-primary-soft text-xs font-bold sm:px-3 sm:py-2.5 sm:text-sm">
				{children}
			</span>
		</label>
	);
}
