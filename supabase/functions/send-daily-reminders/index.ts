// Recorre `push_subscriptions` y manda el recordatorio diario a quien tenga
// `reminder_hour` == la hora actual EN SU zona horaria. Pensada para
// invocarse una vez por hora vía cron (ver `supabase/notifications.sql` ›
// `cron-daily-reminders.sql`), no una vez al día: así cada usuario recibe el
// aviso a SU hora local sin necesitar 24 jobs distintos.
//
// Desplegar sin exigir JWT de usuario (la llama un cron, no una persona con
// sesión): `supabase functions deploy send-daily-reminders --no-verify-jwt`.
// Sin `verify_jwt` esto es un endpoint público, así que en su lugar valida un
// secreto propio (`CRON_SECRET`, ver abajo) contra el header `Authorization`
// — evita que cualquiera que adivine la URL dispare envíos a discreción.
//
// Secrets que necesita (`supabase secrets set ...`):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: del dueño),
//   CRON_SECRET (cualquier cadena larga al azar — la misma que va en el
//   header `Authorization: Bearer <CRON_SECRET>` de `cron-daily-reminders.sql`)

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@example.com";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

interface PushSubscriptionRow {
	device_id: string;
	endpoint: string;
	p256dh: string;
	auth_key: string;
	timezone: string;
	reminder_hour: number;
}

/** Hora local (0-23) de `timezone` en este instante. `Intl` ya sabe manejar DST; una resta de offset fijo no. */
function localHourInTimezone(timezone: string): number | null {
	try {
		const formatted = new Intl.DateTimeFormat("en-US", {
			timeZone: timezone,
			hour: "numeric",
			hour12: false,
		}).format(new Date());

		// "24" a medianoche en algunos locales/runtimes; se normaliza a 0.
		return Number.parseInt(formatted, 10) % 24;
	} catch {
		return null;
	}
}

Deno.serve(async (req) => {
	if (req.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	const authHeader = req.headers.get("Authorization") ?? "";
	if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
		return new Response("Unauthorized", { status: 401 });
	}

	webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

	const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

	const { data: subscriptions, error } = await supabaseAdmin
		.from("push_subscriptions")
		.select("device_id, endpoint, p256dh, auth_key, timezone, reminder_hour");

	if (error) {
		console.error("Failed to list push subscriptions:", error);
		return new Response("Failed to list subscriptions", { status: 500 });
	}

	const due = (subscriptions ?? []).filter(
		(row: PushSubscriptionRow) =>
			localHourInTimezone(row.timezone) === row.reminder_hour,
	);

	const payload = JSON.stringify({
		title: "¿Practicamos un rato?",
		body: "Tu racha te está esperando en World Flags.",
	});

	const staleDeviceIds: string[] = [];

	await Promise.all(
		due.map(async (row: PushSubscriptionRow) => {
			try {
				await webpush.sendNotification(
					{
						endpoint: row.endpoint,
						keys: { p256dh: row.p256dh, auth: row.auth_key },
					},
					payload,
				);
			} catch (sendError) {
				// 404/410 = la suscripción ya no existe en el navegador
				// (desinstalada, permiso revocado, endpoint expirado): se borra
				// para no reintentar para siempre. Cualquier otro error se
				// registra y se deja para el siguiente cron.
				const statusCode = (sendError as { statusCode?: number }).statusCode;
				if (statusCode === 404 || statusCode === 410) {
					staleDeviceIds.push(row.device_id);
				} else {
					console.error(
						`Failed to send push to device ${row.device_id}:`,
						sendError,
					);
				}
			}
		}),
	);

	if (staleDeviceIds.length > 0) {
		await supabaseAdmin
			.from("push_subscriptions")
			.delete()
			.in("device_id", staleDeviceIds);
	}

	return new Response(
		JSON.stringify({ sent: due.length - staleDeviceIds.length, stale: staleDeviceIds.length }),
		{ headers: { "Content-Type": "application/json" } },
	);
});
