import { supabase } from "@/lib/supabase";
import { getOrCreateDeviceId } from "@/utils/learning-storage";

/** El `applicationServerKey` de `pushManager.subscribe` quiere `Uint8Array`, no el base64url que da la VAPID key. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
	const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
	const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = window.atob(base64);

	return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function isPushSupported(): boolean {
	return (
		typeof window !== "undefined" &&
		"serviceWorker" in navigator &&
		"PushManager" in window &&
		"Notification" in window
	);
}

/**
 * Pide permiso de notificaciones y, si se concede, suscribe este dispositivo
 * y guarda la suscripción vía la Edge Function `subscribe-push` (no se toca
 * la tabla `push_subscriptions` directo desde el cliente — ver
 * `supabase/notifications.sql`).
 *
 * Devuelve `false` sin lanzar ante cualquier fallo (permiso denegado,
 * navegador sin soporte, función no desplegada todavía): es una mejora
 * best-effort, nunca debe romper el flujo de "¿te aviso mañana?".
 */
export async function subscribeToDailyReminder(
	userId: string | null,
): Promise<boolean> {
	if (!isPushSupported()) return false;

	try {
		const permission = await Notification.requestPermission();
		if (permission !== "granted") return false;

		const publicKey = import.meta.env.PUBLIC_VAPID_PUBLIC_KEY;
		if (!publicKey) return false;

		const registration = await navigator.serviceWorker.ready;

		const subscription =
			(await registration.pushManager.getSubscription()) ??
			(await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
			}));

		const { endpoint, keys } = subscription.toJSON() as {
			endpoint: string;
			keys: { p256dh: string; auth: string };
		};

		const { error } = await supabase.functions.invoke("subscribe-push", {
			body: {
				deviceId: getOrCreateDeviceId(),
				userId,
				endpoint,
				p256dh: keys.p256dh,
				auth: keys.auth,
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				reminderHour: new Date().getHours(),
			},
		});

		return !error;
	} catch (error) {
		console.error("Failed to subscribe to daily reminder:", error);
		return false;
	}
}
