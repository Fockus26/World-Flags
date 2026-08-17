import type { AvatarStyle } from "@/types/progress";

export const AVATAR_SEEDS = [
	"explorer-1",
	"explorer-2",
	"explorer-3",
	"explorer-4",
	"explorer-5",
	"explorer-6",
	"explorer-7",
	"explorer-8",
];

export function getAvatarUrl(style: AvatarStyle, seed: string): string {
	return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}
