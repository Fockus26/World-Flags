import type { AvatarStyle } from "@/types/progress";
import { AVATAR_SEEDS, getAvatarUrl } from "@/utils/avatar";

interface AvatarProps {
	avatarStyle: AvatarStyle;
	value: string;
	onChange: (seed: string) => void;
}

export function Avatar({ avatarStyle, value, onChange }: AvatarProps) {
	return (
		<div className="grid grid-cols-4 gap-3">
			{AVATAR_SEEDS.map((seed) => {
				const isSelected = value === seed;

				return (
					<button
						className={`grid aspect-square place-items-center overflow-hidden rounded-md outline-3 outline-offset-3 outline-transparent cursor-pointer transition-[outline-color,box-shadow,transform,translate] duration-180 hover:-translate-y-0.5 hover:outline-text focus:outline-text`}
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
