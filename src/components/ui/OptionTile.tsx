import type { ReactNode } from "react";
import styles from "./OptionTile.module.css";

interface OptionTileProps {
	name: string;
	value: string;
	checked: boolean;
	onChange: () => void;
	children: ReactNode;
}

export function OptionTile({ name, value, checked, onChange, children }: OptionTileProps) {
	return (
		<label className={styles.option}>
			<input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
			<span>{children}</span>
		</label>
	);
}
