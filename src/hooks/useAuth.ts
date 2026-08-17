import { supabase } from "@/lib/supabase";
import { useAppSelector } from "@/store/hooks";

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
		});

		if (error) {
			return {
				error: error.message,
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
		});

		return {
			error: error?.message ?? null,
		};
	};

	const signInWithEmail = async (email: string, password: string) => {
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		return {
			error: error?.message ?? null,
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
