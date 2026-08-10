import type { Session, User } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AuthStatus = "guest" | "loading" | "authenticated";

interface AuthContextValue {
	user: User | null;
	status: AuthStatus;
	signInWithGoogle: () => Promise<void>;
	signUpWithEmail: (
		email: string,
		password: string,
	) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
	signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
	resendConfirmationEmail: (email: string) => Promise<{ error: string | null }>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
	const context = useContext(AuthContext);

	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}

	return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [status, setStatus] = useState<AuthStatus>("loading");

	useEffect(() => {
		function applySession(session: Session | null) {
			setUser(session?.user ?? null);
			setStatus(session?.user ? "authenticated" : "guest");
		}

		supabase.auth.getSession().then(({ data: { session } }) => {
			applySession(session);
		});

		const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
			applySession(session);
		});

		return () => listener.subscription.unsubscribe();
	}, []);

	const signInWithGoogle = async () => {
		await supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo: window.location.origin },
		});
	};

	const signUpWithEmail = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signUp({ email, password });

		if (error) {
			return { error: error.message, needsEmailConfirmation: false };
		}

		const isExistingAccount = data.user?.identities?.length === 0;
		if (isExistingAccount) {
			return {
				error: "Ya existe una cuenta con este correo. Intenta iniciar sesión.",
				needsEmailConfirmation: false,
			};
		}

		return { error: null, needsEmailConfirmation: !data.session };
	};

	const resendConfirmationEmail = async (email: string) => {
		const { error } = await supabase.auth.resend({ type: "signup", email });
		return { error: error?.message ?? null };
	};

	const signInWithEmail = async (email: string, password: string) => {
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		return { error: error?.message ?? null };
	};

	const signOut = async () => {
		await supabase.auth.signOut();
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				status,
				signInWithGoogle,
				resendConfirmationEmail,
				signUpWithEmail,
				signInWithEmail,
				signOut,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
