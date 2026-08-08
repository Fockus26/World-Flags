import { type SubmitEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import styles from "./AuthSection.module.css";

type AuthMode = "signin" | "signup";

export function AuthSection() {
	const { status, user, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut } = useAuth();
	const [mode, setMode] = useState<AuthMode>("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (status === "authenticated") {
		return (
			<div className={styles.authSection}>
				<p className={styles.accountStatus}>
					Sesión iniciada como <strong>{user?.email}</strong>
				</p>
				<Button variant="secondary" type="button" onClick={() => signOut()}>
					Cerrar sesión
				</Button>
			</div>
		);
	}

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);

		const action = mode === "signin" ? signInWithEmail : signUpWithEmail;
		const { error: authError } = await action(email, password);

		setIsSubmitting(false);

		if (authError) {
			setError(authError);
			return;
		}

		setPassword("");
	}

	return (
		<div className={styles.authSection}>
			<p className={styles.guestNotice}>
				Estás en modo invitado. Tu progreso se guarda solo en este dispositivo.
			</p>

			<fieldset className={styles.modeSwitch} aria-label="Tipo de acceso">
				<button
					type="button"
					className={
						mode === "signin"
							? `${styles.modeButton} ${styles.modeButtonActive}`
							: styles.modeButton
					}
					aria-pressed={mode === "signin"}
					onClick={() => setMode("signin")}
				>
					Iniciar sesión
				</button>
				<button
					type="button"
					className={
						mode === "signup"
							? `${styles.modeButton} ${styles.modeButtonActive}`
							: styles.modeButton
					}
					aria-pressed={mode === "signup"}
					onClick={() => setMode("signup")}
				>
					Crear cuenta
				</button>
			</fieldset>

			<form className={styles.authForm} onSubmit={handleSubmit}>
				<label className={styles.field} htmlFor="auth-email">
					Correo
					<Input
						id="auth-email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</label>

				<label className={styles.field} htmlFor="auth-password">
					Contraseña
					<Input
						id="auth-password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						minLength={6}
						required
					/>
				</label>

				{error && (
					<p className={styles.error} role="alert">
						{error}
					</p>
				)}

				<Button variant="primary" type="submit" disabled={isSubmitting}>
					{mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
				</Button>
			</form>

			<div className={styles.divider}>
				<span>o</span>
			</div>

			<Button variant="secondary" type="button" onClick={() => signInWithGoogle()}>
				Continuar con Google
			</Button>
		</div>
	);
}
