import type { AnswerStatus } from "@/types/country";
import { StimulusFrame } from "./StimulusFrame";

export function FlagDisplay({
	countryCode,
	feedback,
}: {
	countryCode: string;
	feedback?: AnswerStatus;
}) {
	return (
		<StimulusFrame
			feedback={feedback}
			className="
				p-2
				bg-[linear-gradient(45deg,var(--color-surface-hover)_25%,transparent_25%),linear-gradient(-45deg,var(--color-surface-hover)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--color-surface-hover)_75%),linear-gradient(-45deg,transparent_75%,var(--color-surface-hover)_75%)]
				bg-position-[0_0,0_0.75rem,0.75rem_-0.75rem,-0.75rem_0]
				bg-size-[1.5rem_1.5rem]
				min-[30rem]:p-[0.65rem]
				min-[43rem]:p-[clamp(0.75rem,2vh,1.5rem)]
			"
		>
			{/* `key` por país: cada bandera nueva se remonta y entra deslizándose
			    desde la derecha (D153); el `overflow-hidden` del marco recorta el
			    desplazamiento. Antes era un `motion.img` con `initial={false}`
			    (D006), o sea, sin entrada. `animation-duration-200` y no
			    `duration-200`: este último cambiaría también los 180 ms del hover. */}
			<img
				key={countryCode}
				className="block h-full w-[min(100%,30rem)] max-h-72 object-contain transition-[filter,transform,scale] duration-180 ease-in-out hover:scale-[1.015] animate-in fade-in-0 slide-in-from-right-4 animation-duration-200"
				src={`/flags/${countryCode}.svg`}
				alt="Bandera que debes identificar"
			/>
		</StimulusFrame>
	);
}
