export function shuffle<T>(items: readonly T[]): T[] {
	const shuffledItems = [...items];

	for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));

		[shuffledItems[index], shuffledItems[randomIndex]] = [
			shuffledItems[randomIndex],
			shuffledItems[index],
		];
	}

	return shuffledItems;
}
