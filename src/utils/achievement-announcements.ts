/**
 * Decide qué logros recién sellados se anuncian (snackbar) y cuáles no.
 *
 * La primera evaluación tras CADA hidratación (arranque, o un login/logout
 * que trae datos nuevos) sella lo que ya se había ganado pero NO lo anuncia:
 * es un reencuadre retroactivo del progreso que ya tenías (o de lo que un
 * login trae fusionado desde otro dispositivo), no algo que "acaba de pasar".
 * Cualquier desbloqueo posterior, con los datos ya asentados, sí es en vivo.
 *
 * El silencio se gasta en esa primera pasada **encuentre o no algo**. Si solo
 * se gastara al encontrar logros, un perfil nuevo (que no trae ninguno)
 * dejaría el silencio pendiente y se tragaría el primer logro de verdad.
 */
export interface AchievementAnnouncementGate {
	/** Vuelve a silenciar la próxima pasada (se salió de `ready`). */
	reset: () => void;
	/**
	 * Registra una pasada con los datos hidratados y devuelve los ids a
	 * anunciar: ninguno si es la primera pasada tras hidratar.
	 */
	pass: (newlyUnlocked: string[]) => string[];
}

export function createAchievementAnnouncementGate(): AchievementAnnouncementGate {
	let isNextPassSilent = true;

	return {
		reset() {
			isNextPassSilent = true;
		},
		pass(newlyUnlocked) {
			const isSilent = isNextPassSilent;

			isNextPassSilent = false;

			return isSilent ? [] : newlyUnlocked;
		},
	};
}
