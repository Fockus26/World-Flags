import { type SubmitEvent, useEffect, useState } from "react";
import { AutoHeight } from "@/components/ui/AutoHeight";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { EmailConfirmationPending } from "./EmailConfirmationPending";

type AuthMode = "signin" | "signup";

/**
 * Cerrar sesión con progreso sin subir (D053):
 *
 * - `saving`: hay conexión; se pide sincronizar ya y, en cuanto no queda
 *   nada pendiente, se cierra la sesión sola.
 * - `confirm`: no se pudo subir (sin red, error del servidor o tarda
 *   demasiado). Cerrar sesión borra los datos de la cuenta de este
 *   dispositivo (D009), así que se avisa y se pide confirmación.
 */
type SignOutStep = "idle" | "saving" | "confirm";

/** Algo más que el tope de la sincronización (10 s, D045): si no terminó, no va a terminar. */
const SIGN_OUT_SAVE_TIMEOUT_MS = 12_000;

export function AuthSection() {
	const {
		status,
		user,
		signInWithEmail,
		signUpWithEmail,
		signInWithGoogle,
		signOut,
	} = useAuth();

	const { isOnline, hasPendingChanges, hasServerError, requestSync } =
		useSyncStatus();

	const [signOutStep, setSignOutStep] = useState<SignOutStep>("idle");

	function handleSignOut() {
		if (signOutStep === "saving") return;

		if (!hasPendingChanges || signOutStep === "confirm") {
			void signOut();
			return;
		}

		if (isOnline && !hasServerError) {
			setSignOutStep("saving");
			requestSync();
		} else {
			setSignOutStep("confirm");
		}
	}

	useEffect(() => {
		if (signOutStep !== "saving") return;

		// Subido: ya no hay nada que perder.
		if (!hasPendingChanges) {
			setSignOutStep("idle");
			void signOut();
			return;
		}

		// Falló la subida mientras se esperaba.
		if (!isOnline || hasServerError) {
			setSignOutStep("confirm");
		}
	}, [signOutStep, hasPendingChanges, isOnline, hasServerError, signOut]);

	// Aparte, para que otros renders no reinicien la espera.
	useEffect(() => {
		if (signOutStep !== "saving") return;

		const timeoutId = setTimeout(
			() => setSignOutStep("confirm"),
			SIGN_OUT_SAVE_TIMEOUT_MS,
		);

		return () => clearTimeout(timeoutId);
	}, [signOutStep]);

	const [mode, setMode] = useState<AuthMode>("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [pendingConfirmation, setPendingConfirmation] = useState<{
		email: string;
		password: string;
	} | null>(null);

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		if (mode === "signup" && password !== confirmPassword) {
			setError("Las contraseñas no coinciden.");
			return;
		}

		setIsSubmitting(true);

		if (mode === "signup") {
			const { error: authError, needsEmailConfirmation } =
				await signUpWithEmail(email, password);

			if (authError) {
				setIsSubmitting(false);
				setError(authError);
				return;
			}

			if (needsEmailConfirmation) {
				setPendingConfirmation({ email, password });
			}

			setIsSubmitting(false);
			setPassword("");
			setConfirmPassword("");
			return;
		}

		const { error: authError } = await signInWithEmail(email, password);
		setIsSubmitting(false);

		if (authError) {
			setError(authError);
			return;
		}

		setPassword("");
	}

	const view =
		status === "authenticated"
			? "authenticated"
			: pendingConfirmation
				? "pending"
				: "form";

	if (view === "authenticated") {
		return (
			<div className="flex flex-col gap-3 animate-in fade-in-0 zoom-in-95 duration-300">
				<p className="m-0 text-[0.875rem]">
					Sesión iniciada como <strong>{user?.email}</strong>
				</p>

				{signOutStep === "saving" && (
					<p
						id="sign-out-status"
						role="status"
						className="m-0 text-[0.8rem] text-text-placeholder"
					>
						Guardando tu progreso en tu cuenta antes de cerrar sesión…
					</p>
				)}

				{signOutStep === "confirm" && (
					<FeedbackMessage variant="danger" size="sm" role="alert">
						<span id="sign-out-status">
							Tienes progreso que aún no está en tu cuenta. Si cierras sesión
							ahora, se perderá. Con conexión se guarda solo en unos segundos.
						</span>
					</FeedbackMessage>
				)}

				{/* El botón de cerrar sesión no se desmonta ni se deshabilita al
				    pasar por los avisos: así el foco de teclado no se pierde. */}
				<div className="flex gap-2">
					{signOutStep === "confirm" && (
						<Button
							color="neutral"
							variant="soft"
							type="button"
							onClick={() => setSignOutStep("idle")}
						>
							Cancelar
						</Button>
					)}
					<Button
						color="danger"
						type="button"
						onClick={handleSignOut}
						aria-describedby={
							signOutStep === "idle" ? undefined : "sign-out-status"
						}
					>
						{signOutStep === "saving"
							? "Guardando…"
							: signOutStep === "confirm"
								? "Cerrar sesión igualmente"
								: "Cerrar sesión"}
					</Button>
				</div>
			</div>
		);
	}

	if (view === "pending" && pendingConfirmation) {
		return (
			<div className="animate-in fade-in-0 slide-in-from-right-2 duration-250">
				<EmailConfirmationPending
					email={pendingConfirmation.email}
					password={pendingConfirmation.password}
					onCancel={() => setPendingConfirmation(null)}
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 animate-in fade-in-0 duration-200">
			<p className="m-0 text-text-placeholder text-[0.8rem]">
				Estás en modo invitado. Tu progreso se guarda solo en este dispositivo.
			</p>

			{/* Sin red no hay login posible (D052): se dice antes de que lo
			    intenten, y los botones esperan a la conexión. */}
			{!isOnline && (
				<p
					id="auth-offline-note"
					className="m-0 flex items-start gap-2 text-[0.8rem] text-surface-soft"
				>
					<span aria-hidden="true">📡</span>
					<span>
						Sin conexión: para iniciar sesión o crear una cuenta necesitas
						internet.
					</span>
				</p>
			)}

			<div className="mb-1 flex" role="tablist" aria-label="Tipo de acceso">
				{(["signin", "signup"] as const).map((item) => (
					<button
						key={item}
						type="button"
						role="tab"
						aria-selected={mode === item}
						className="relative flex-1 cursor-pointer px-[0.2rem] py-2 text-center font-[inherit] font-bold text-text-placeholder transition-colors duration-150 hover:text-surface-soft aria-selected:text-surface-soft focus-visible:text-surface-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-surface-soft"
						onClick={() => {
							setMode(item);
							setError(null);
						}}
					>
						{item === "signin" ? "Iniciar sesión" : "Crear cuenta"}
						{mode === item && (
							<span className="absolute right-0 bottom-px left-0 h-0.5 bg-surface-soft" />
						)}
					</button>
				))}
			</div>

			<form className="flex flex-col gap-3" onSubmit={handleSubmit}>
				<Input
					id="auth-email"
					type="email"
					label="Correo"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
				<Input
					id="auth-password"
					type="password"
					label="Contraseña"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					minLength={6}
					required
				/>
				<AutoHeight show={mode === "signup"}>
					<Input
						id="auth-confirm-password"
						type="password"
						label="Repetir contraseña"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						minLength={6}
						required={mode === "signup"}
					/>
				</AutoHeight>
				{error && (
					<FeedbackMessage
						variant="danger"
						size="sm"
						role="alert"
						autoDismissMs={5000}
						onDismiss={() => setError(null)}
					>
						{error}
					</FeedbackMessage>
				)}
				<Button
					type="submit"
					disabled={isSubmitting || !isOnline}
					aria-describedby={isOnline ? undefined : "auth-offline-note"}
				>
					{isSubmitting
						? "Un momento…"
						: mode === "signin"
							? "Iniciar sesión"
							: "Crear cuenta"}
				</Button>
			</form>

			<div className="my-1 flex items-center gap-3 text-text-placeholder text-xs">
				<span className="h-px flex-1 bg-[var(--border)]" />o
				<span className="h-px flex-1 bg-[var(--border)]" />
			</div>

			<Button
				variant="text"
				color="neutral"
				type="button"
				disabled={!isOnline}
				aria-describedby={isOnline ? undefined : "auth-offline-note"}
				onClick={() => signInWithGoogle()}
			>
				Continuar con Google
			</Button>
		</div>
	);
}
