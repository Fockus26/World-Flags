import type { Session } from "@supabase/supabase-js";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";

import type { AppDispatch } from "@/store";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { setAuthState } from "@/store/slices/authSlice";

function applySession(dispatch: AppDispatch, session: Session | null) {
	dispatch(
		setAuthState({
			user: session?.user ?? null,
			status: session?.user ? "authenticated" : "guest",
		}),
	);
}

export function AuthEffects() {
	const dispatch = useAppDispatch();

	const status = useAppSelector((state) => state.auth.status);

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			applySession(dispatch, session);
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [dispatch]);

	useEffect(() => {
		if (status === "authenticated" && window.opener) {
			window.close();
		}
	}, [status]);

	return null;
}
