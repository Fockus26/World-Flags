import FlagGame from "./game/FlagGame";
import Providers from "./Providers";

export default function App() {
	return (
		<Providers>
			<FlagGame />
		</Providers>
	);
}
