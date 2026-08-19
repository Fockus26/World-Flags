import { AnimatePresence, motion } from "framer-motion";
import { type SubmitEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { motionTransition, motionVariants } from "@/styles/animations";
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

					<Button color="danger" type="button" onClick={() => signOut()}>
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
					<p className="m-0 text-text-placeholder text-[0.8rem]">
						Estás en modo invitado. Tu progreso se guarda solo en este dispositivo.
					</p>

					<div className="mb-1 flex" role="tablist" aria-label="Tipo de acceso">
						{(["signin", "signup"] as const).map((item) => (
							<button
								key={item}
								type="button"
								role="tab"
								aria-selected={mode === item}
								className="relative flex-1 cursor-pointer px-[0.2rem] py-2 text-center font-[inherit] font-bold text-text-placeholder transition-colors duration-150 hover:text-surface-soft active:text-surface-soft aria-selected:text-surface-soft focus:text-surface-soft"
								onClick={() => {
									setMode(item);
									setError(null);
								}}
							>
								{item === "signin" ? "Iniciar sesión" : "Crear cuenta"}
								{mode === item && (
									<motion.span
										className="absolute right-0 bottom-px left-0 h-0.5 bg-surface-soft"
										layoutId="authModeIndicator"
										transition={{ type: "spring", stiffness: 500, damping: 40 }}
									/>
								)}
							</button>
						))}
					</div>

					<motion.form
						className="flex flex-col gap-3"
						layout
						transition={{ layout: motionTransition(0.2) }}
						onSubmit={handleSubmit}
					>
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
						<AnimatePresence mode="popLayout" initial={false}>
							{mode === "signup" && (
								<motion.div
									key="confirm-password"
									layout
									transition={{ layout: motionTransition(0.2) }}
									variants={motionVariants.answerFeedbackEnter}
									initial="hidden"
									animate="visible"
									exit="exit"
								>
									<Input
										id="auth-confirm-password"
										type="password"
										label="Repetir contraseña"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										minLength={6}
										required
									/>
								</motion.div>
							)}
						</AnimatePresence>
						<AnimatePresence mode="popLayout">
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
						</AnimatePresence>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting
								? "Un momento…"
								: mode === "signin"
									? "Iniciar sesión"
									: "Crear cuenta"}
						</Button>
					</motion.form>

					<div className="relative my-1 flex justify-center text-center before:absolute before:top-1/2 before:right-0 before:left-0 before:border-text-placeholder before:border-t">
						<span className="relative z-10 bg-surface px-3 text-text-placeholder text-xs">
							o
						</span>
					</div>

					<Button
						variant="text"
						color="neutral"
						type="button"
						onClick={() => signInWithGoogle()}
					>
						Continuar con Google
					</Button>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
