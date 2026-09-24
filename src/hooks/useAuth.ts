import {
	type AuthError,
	isAuthRetryableFetchError,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useAppSelector } from "@/store/hooks";

/**
 * Sin red, Supabase Auth devuelve un "Failed to fetch" en inglés: se cambia
 * por un mensaje que diga lo que pasa (D052). Copy provisional
 * (`context/CONTENT_CHECKLIST.md`). El resto de errores, tal cual.
 */
export const AUTH_OFFLINE_MESSAGE =
	"Sin conexión. Inténtalo de nuevo cuando vuelvas a estar en línea.";

function toAuthErrorMessage(error: AuthError): string {
	return isAuthRetryableFetchError(error)
		? AUTH_OFFLINE_MESSAGE
		: error.message;
}

export function useAuth() {
	const user = useAppSelector((state) => state.auth.user);
	const status = useAppSelector((state) => state.auth.status);

	const signInWithGoogle = async () => {
		const width = 500;
		const height = 600;
		const left = window.screenX + (window.outerWidth - width) / 2;
		const top = window.screenY + (window.outerHeight - height) / 2;

		const popup = window.open(
			"",
			"google-oauth",
			`width=${width},height=${height},left=${left},top=${top}`,
		);

		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: window.location.origin,
				skipBrowserRedirect: true,
			},
		});

		if (error || !data.url) {
			popup?.close();
			return;
		}

		if (popup) {
			popup.location.href = data.url;
		}
	};

	const signUpWithEmail = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: { emailRedirectTo: window.location.origin },
		});

		if (error) {
			return {
				error: toAuthErrorMessage(error),
				needsEmailConfirmation: false,
			};
		}

		const isExistingAccount = data.user?.identities?.length === 0;

		if (isExistingAccount) {
			return {
				error: "Ya existe una cuenta con este correo. Intenta iniciar sesión.",
				needsEmailConfirmation: false,
			};
		}

		return {
			error: null,
			needsEmailConfirmation: !data.session,
		};
	};

	const resendConfirmationEmail = async (email: string) => {
		const { error } = await supabase.auth.resend({
			type: "signup",
			email,
			options: { emailRedirectTo: window.location.origin },
		});

		return {
			error: error ? toAuthErrorMessage(error) : null,
		};
	};

	const signInWithEmail = async (email: string, password: string) => {
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		return {
			error: error ? toAuthErrorMessage(error) : null,
		};
	};

	const signOut = async () => {
		await supabase.auth.signOut();
	};

	return {
		user,
		status,
		signInWithGoogle,
		signUpWithEmail,
		signInWithEmail,
		resendConfirmationEmail,
		signOut,
	};
}
