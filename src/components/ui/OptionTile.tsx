import type { ReactNode } from "react";

interface OptionTileProps {
	name: string;
	value: string;
	checked: boolean;
	onChange: () => void;
	children: ReactNode;
}

/**
 * Opción segmentada de selección única (radio nativo accesible) alineada con
 * los tokens de HeroUI (`--accent`, `--default`, `--border`, `--radius`).
 */
export function OptionTile({
	name,
	value,
	checked,
	onChange,
	children,
}: OptionTileProps) {
	return (
		<label
			className="
				group relative flex w-full min-w-0 cursor-pointer items-center justify-center
				rounded-[var(--radius)] border border-[var(--border)] bg-[var(--default)]
				text-[var(--default-foreground)]
				transition-colors duration-150 ease-in-out
				min-h-10 sm:min-h-11
				hover:bg-[var(--default-hover)]
				has-checked:border-[var(--accent)] has-checked:bg-[var(--accent)]
				has-checked:text-[var(--accent-foreground)]
				has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-offset-2
				has-focus-visible:outline-[var(--focus)]
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
			<span className="px-3 py-2 text-xs font-bold sm:text-sm">{children}</span>
		</label>
	);
}
