import { AnimatePresence, motion } from "framer-motion";
import { type SubmitEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { motionVariants } from "@/styles/animations";
import { EmailConfirmationPending } from "./EmailConfirmationPending";

type AuthMode = "signin" | "signup";

export function AuthSection() {
	const { status, user, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut } = useAuth();

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
			const { error: authError, needsEmailConfirmation } = await signUpWithEmail(
				email,
				password,
			);

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
		status === "authenticated" ? "authenticated" : pendingConfirmation ? "pending" : "form";

	return (
		<AnimatePresence mode="wait" initial={false}>
			{view === "authenticated" && (
				<motion.div
					key="authenticated"
					className="flex flex-col gap-3"
					variants={motionVariants.tabContentSwitch}
					initial="hidden"
					animate="visible"
					exit="hidden"
				>
					<p className="m-0 text-[0.875rem]">
						Sesión iniciada como <strong>{user?.email}</strong>
					</p>

					<Button variant="secondary" type="button" onClick={() => signOut()}>
						Cerrar sesión
					</Button>
				</motion.div>
			)}

			{view === "pending" && pendingConfirmation && (
				<motion.div
					key="pending"
					variants={motionVariants.tabContentSwitch}
					initial="hidden"
					animate="visible"
					exit="hidden"
				>
					<EmailConfirmationPending
						email={pendingConfirmation.email}
						password={pendingConfirmation.password}
						onCancel={() => setPendingConfirmation(null)}
					/>
				</motion.div>
			)}

			{view === "form" && (
				<motion.div
					key="form"
					className="flex flex-col gap-3"
					variants={motionVariants.tabContentSwitch}
					initial="hidden"
					animate="visible"
					exit="hidden"
				>
					<p className="m-0 text-text-subtle text-[0.8rem]">
						Estás en modo invitado. Tu progreso se guarda solo en este dispositivo.
					</p>

					<fieldset className="m-0 flex gap-1 border-0 p-0" aria-label="Tipo de acceso">
						<button
							type="button"
							className={`flex-1 cursor-pointer rounded-sm border border-border-lighter bg-transparent p-1 text-text-subtle font-[inherit] text-[0.8rem] font-bold transition-colors duration-150 ${
								mode === "signin" ? "bg-text text-surface" : ""
							}`}
							aria-pressed={mode === "signin"}
							onClick={() => setMode("signin")}
						>
							Iniciar sesión
						</button>

						<button
							type="button"
							className={`flex-1 cursor-pointer rounded-sm border border-border-lighter bg-transparent p-1 text-text-subtle font-[inherit] text-[0.8rem] font-bold transition-colors duration-150 ${
								mode === "signup" ? "bg-text text-surface" : ""
							}`}
							aria-pressed={mode === "signup"}
							onClick={() => setMode("signup")}
						>
							Crear cuenta
						</button>
					</fieldset>

					<form className="flex flex-col gap-2" onSubmit={handleSubmit}>
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

						{mode === "signup" && (
							<Input
								id="auth-confirm-password"
								type="password"
								label="Repetir contraseña"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								minLength={6}
								required
							/>
						)}

						<AnimatePresence>
							{error && (
								<motion.p
									className="m-0 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-danger-text text-[0.8rem] font-semibold"
									role="alert"
									variants={motionVariants.feedbackEnter}
									initial="hidden"
									animate="visible"
									exit="hidden"
								>
									{error}
								</motion.p>
							)}
						</AnimatePresence>

						<Button variant="primary" type="submit" disabled={isSubmitting}>
							{isSubmitting
								? "Un momento…"
								: mode === "signin"
									? "Iniciar sesión"
									: "Crear cuenta"}
						</Button>
					</form>

					<div className="relative my-1 flex justify-center text-center before:absolute before:top-1/2 before:right-0 before:left-0 before:border-border-lighter before:border-t">
						<span className="relative z-1 bg-surface px-2 text-text-subtle text-[0.75rem]">
							o
						</span>
					</div>

					<Button variant="secondary" type="button" onClick={() => signInWithGoogle()}>
						Continuar con Google
					</Button>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
