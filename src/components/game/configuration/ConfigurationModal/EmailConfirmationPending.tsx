import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { spinTransition } from "@/styles/animations";
import styles from "./EmailConfirmationPending.module.css";

interface EmailConfirmationPendingProps {
	email: string;
	password: string;
	onCancel: () => void;
}

const POLL_INTERVAL_MS = 8000;

export function EmailConfirmationPending({
	email,
	password,
	onCancel,
}: EmailConfirmationPendingProps) {
	const { signInWithEmail, resendConfirmationEmail } = useAuth();
	const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

	// biome-ignore lint/correctness/useExhaustiveDependencies: signInWithEmail está estabilizado por React Compiler (ver docs/components.md)
	useEffect(() => {
		const intervalId = window.setInterval(() => {
			signInWithEmail(email, password);
		}, POLL_INTERVAL_MS);

		return () => window.clearInterval(intervalId);
	}, [email, password]);

	async function handleResend() {
		setResendState("sending");
		await resendConfirmationEmail(email);
		setResendState("sent");
	}

	return (
		<div className={styles.pending}>
			<motion.div
				className={styles.spinner}
				aria-hidden="true"
				animate={{ rotate: 360 }}
				transition={spinTransition}
			/>

			<h3>Revisa tu correo</h3>

			<p>
				Te enviamos un enlace de confirmación a <strong>{email}</strong>. Esta pantalla se
				cerrará sola cuando confirmes tu cuenta.
			</p>

			<div className={styles.actions}>
				<Button
					variant="secondary"
					type="button"
					onClick={handleResend}
					disabled={resendState === "sending"}
				>
					{resendState === "sent" ? "Correo reenviado" : "Reenviar correo"}
				</Button>

				<Button variant="secondary" type="button" onClick={onCancel}>
					Usar otro correo
				</Button>
			</div>
		</div>
	);
}
