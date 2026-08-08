import { AVATAR_STYLES, type AvatarStyle } from "@/types/progress";
import styles from "./AvatarStylePicker.module.css";

interface AvatarStylePickerProps {
	value: AvatarStyle;
	onChange: (style: AvatarStyle) => void;
}

export function AvatarStylePicker({ value, onChange }: AvatarStylePickerProps) {
	return (
		<fieldset className={styles.avatarFieldset}>
			<legend>Estilo</legend>
			<div className={styles.avatarStyleGrid}>
				{AVATAR_STYLES.map((style) => (
					<label className={styles.avatarStyleOption} key={style}>
						<input
							type="radio"
							name="avatar-style"
							value={style}
							checked={value === style}
							onChange={() => onChange(style)}
						/>
						<span>{style}</span>
					</label>
				))}
			</div>
		</fieldset>
	);
}
