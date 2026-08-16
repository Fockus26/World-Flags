import type { AvatarStyle } from "@/types/progress";
import { AVATAR_SEEDS, getAvatarUrl } from "@/utils/avatar";

interface AvatarProps {
	avatarStyle: AvatarStyle;
	value: string;
	onChange: (seed: string) => void;
}

export function Avatar({ avatarStyle, value, onChange }: AvatarProps) {
	return (
		<div className="grid grid-cols-4 gap-2 max-[30rem]:gap-1">
			{AVATAR_SEEDS.map((seed) => {
				const isSelected = value === seed;

				return (
					<button
						className={`grid aspect-square place-items-center overflow-hidden rounded-md border-2 border-transparent bg-surface-secondary p-1 cursor-pointer transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-border-primary-hover hover:shadow-(--shadow-avatar) ${isSelected ? "border-primary shadow-(--shadow-avatar-active)" : ""}`}
						type="button"
						key={seed}
						onClick={() => onChange(seed)}
						aria-label={`Seleccionar avatar ${seed}`}
						aria-pressed={isSelected}
					>
						<img
							className="block size-full object-cover"
							src={getAvatarUrl(avatarStyle, seed)}
							alt=""
						/>
					</button>
				);
			})}
		</div>
	);
}
