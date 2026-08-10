import type { AvatarStyle } from "@/types/progress";
import { AVATAR_SEEDS, getAvatarUrl } from "@/utils/avatar";
import styles from "./Avatar.module.css";

interface AvatarProps {
	avatarStyle: AvatarStyle;
	value: string;
	onChange: (seed: string) => void;
}

export function Avatar({ avatarStyle, value, onChange }: AvatarProps) {
	return (
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
	);
}
