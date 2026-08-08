import type { AvatarStyle } from "@/types/progress";
import { AVATAR_SEEDS, getAvatarUrl } from "@/utils/avatar";
import styles from "./AvatarSeedPicker.module.css";

interface AvatarSeedPickerProps {
	avatarStyle: AvatarStyle;
	value: string;
	onChange: (seed: string) => void;
}

export function AvatarSeedPicker({
	avatarStyle,
	value,
	onChange,
}: AvatarSeedPickerProps) {
	return (
		<fieldset className={styles.avatarFieldset}>
			<legend>Avatar</legend>
			<div className={styles.avatarSelectionGrid}>
				{AVATAR_SEEDS.map((seed) => {
					const isSelected = value === seed;
					return (
						<button
							className={
								isSelected
									? `${styles.avatarSelection} ${styles.avatarSelectionActive}`
									: styles.avatarSelection
							}
							type="button"
							key={seed}
							onClick={() => onChange(seed)}
							aria-label={`Seleccionar avatar ${seed}`}
							aria-pressed={isSelected}
						>
							<img src={getAvatarUrl(avatarStyle, seed)} alt="" />
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}
