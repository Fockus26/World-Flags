import { useState } from "react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import type { AvatarStyle } from "@/types/progress";
import { AVATAR_SEEDS, getAvatarUrl } from "@/utils/avatar";

interface AvatarProps {
	avatarStyle: AvatarStyle;
	value: string;
	onChange: (seed: string) => void;
}

/**
 * Los avatares vienen de dicebear (CDN externo). Sin conexión, uno que el
 * navegador no tenga en caché no carga (D052): en vez de la imagen rota se ve
 * el número de la opción, que sigue siendo elegible. Decorativo: el nombre
 * accesible lo pone el botón.
 */
function AvatarOptionImage({ src, number }: { src: string; number: number }) {
	const [hasFailed, setHasFailed] = useState(false);

	if (hasFailed) {
		return (
			<span
				className="grid size-full place-items-center bg-primary-soft text-xl font-black text-surface-soft"
				aria-hidden="true"
			>
				{number}
			</span>
		);
	}

	return (
		<img
			className="block size-full object-cover"
			src={src}
			alt=""
			onError={() => setHasFailed(true)}
		/>
	);
}

export function Avatar({ avatarStyle, value, onChange }: AvatarProps) {
	// Al volver la red se remontan las imágenes para reintentar las que fallaron.
	const { isOnline } = useSyncStatus();

	return (
		<div className="flex flex-col gap-2">
			{!isOnline && (
				<p className="m-0 flex items-start gap-2 text-[0.8rem] text-surface-soft">
					<span aria-hidden="true">📡</span>
					<span>
						Sin conexión: algunos avatares no se pueden ver hasta que vuelva la
						red. Puedes elegir igualmente.
					</span>
				</p>
			)}

			<div className="grid grid-cols-4 gap-3">
				{AVATAR_SEEDS.map((seed, index) => {
					const isSelected = value === seed;
					const src = getAvatarUrl(avatarStyle, seed);

					return (
						<button
							className={`grid aspect-square place-items-center overflow-hidden rounded-full outline-3 outline-offset-3 cursor-pointer transition-[outline-color,transform,translate] duration-180 hover:-translate-y-0.5 active:-translate-y-0.5 hover:outline-surface-soft active:outline-surface-soft focus-visible:outline-[var(--focus)] ${
								isSelected ? "outline-primary" : "outline-transparent"
							}`}
							type="button"
							key={seed}
							onClick={() => onChange(seed)}
							aria-label={`Seleccionar avatar ${seed}`}
							aria-pressed={isSelected}
						>
							<AvatarOptionImage
								key={`${src}|${isOnline}`}
								src={src}
								number={index + 1}
							/>
						</button>
					);
				})}
			</div>
		</div>
	);
}
