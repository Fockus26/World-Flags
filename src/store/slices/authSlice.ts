import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@supabase/supabase-js";

export type AuthStatus = "guest" | "loading" | "authenticated";

interface AuthState {
	user: User | null;
	status: AuthStatus;
}

const initialState: AuthState = {
	user: null,
	status: "loading",
};

const authSlice = createSlice({
	name: "auth",
	initialState,
	reducers: {
		setAuthState: (
			state,
			action: PayloadAction<{
				user: User | null;
				status: AuthStatus;
			}>,
		) => {
			state.user = action.payload.user;
			state.status = action.payload.status;
		},
	},
});

export const { setAuthState } = authSlice.actions;

export default authSlice.reducer;
