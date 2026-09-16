// Alta/actualización de una suscripción Web Push. Corre con la service role
// key (nunca se toca `push_subscriptions` directo desde el cliente — ver el
// comentario de RLS en `supabase/notifications.sql`).
//
// Desplegar: `supabase functions deploy subscribe-push`
// Sin JWT obligatorio (invitados también suscriben): `supabase functions deploy subscribe-push --no-verify-jwt`

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface SubscribeBody {
	deviceId: string;
	userId: string | null;
	endpoint: string;
	p256dh: string;
	auth: string;
	timezone: string;
	reminderHour: number;
}

Deno.serve(async (req) => {
	if (req.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	let body: SubscribeBody;

	try {
		body = await req.json();
	} catch {
		return new Response("Invalid JSON", { status: 400 });
	}

	const { deviceId, userId, endpoint, p256dh, auth, timezone, reminderHour } =
		body;

	if (!deviceId || !endpoint || !p256dh || !auth) {
		return new Response("Missing fields", { status: 400 });
	}

	const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

	// Si viene un `userId`, se verifica contra el JWT de la request (nunca se
	// confía en lo que declare el body): sin esto, cualquiera podría atribuir
	// su suscripción a la cuenta de otro.
	if (userId) {
		const authHeader = req.headers.get("Authorization") ?? "";
		const token = authHeader.replace("Bearer ", "");

		const { data: authData, error: authError } =
			await supabaseAdmin.auth.getUser(token);

		if (authError || authData.user?.id !== userId) {
			return new Response("User id does not match token", { status: 401 });
		}
	}

	const { error } = await supabaseAdmin.from("push_subscriptions").upsert({
		device_id: deviceId,
		user_id: userId,
		endpoint,
		p256dh,
		auth_key: auth,
		timezone: timezone || "UTC",
		reminder_hour:
			Number.isInteger(reminderHour) && reminderHour >= 0 && reminderHour <= 23
				? reminderHour
				: 19,
		updated_at: new Date().toISOString(),
	});

	if (error) {
		console.error("Failed to upsert push subscription:", error);
		return new Response("Failed to save subscription", { status: 500 });
	}

	return new Response(JSON.stringify({ ok: true }), {
		headers: { "Content-Type": "application/json" },
	});
});
