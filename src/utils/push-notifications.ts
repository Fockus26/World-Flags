import { supabase } from "@/lib/supabase";
import { getOrCreateDeviceId } from "@/utils/learning-storage";

/** El `applicationServerKey` de `pushManager.subscribe` quiere `Uint8Array`, no el base64url que da la VAPID key. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
	const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
	const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = window.atob(base64);

	return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

/**
 * Si `navigator.serviceWorker.ready` no llega en este tiempo, se da por fallido:
 * `ready` no se resuelve nunca si el SW no llegó a registrarse, y el aviso se
 * quedaría "esperando" para siempre (D127).
 */
const SERVICE_WORKER_READY_TIMEOUT_MS = 10_000;

/**
 * Por qué este navegador puede (o no) recibir el recordatorio (D127):
 *
 * - `supported`: hay Notification, Push y service worker en un contexto seguro.
 * - `insecure-context`: página servida por `http` fuera de `localhost` (p. ej.
 *   el servidor de desarrollo abierto desde el móvil por la IP de la red): el
 *   navegador esconde esas APIs y nunca puede preguntar.
 * - `ios-needs-install`: iPhone/iPad en Safari sin instalar. iOS (16.4+) solo
 *   da Web Push a la app añadida a la pantalla de inicio.
 * - `unsupported`: el navegador no tiene alguna de las APIs.
 */
export type NotificationSupport =
	| "supported"
	| "insecure-context"
	| "ios-needs-install"
	| "unsupported";

/** iPadOS se presenta como Mac de escritorio: se distingue por la pantalla táctil. */
function isIosDevice(): boolean {
	return (
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
	);
}

function isInstalledApp(): boolean {
	return (
		window.matchMedia("(display-mode: standalone)").matches ||
		(navigator as Navigator & { standalone?: boolean }).standalone === true
	);
}

export function getNotificationSupport(): NotificationSupport {
	if (typeof window === "undefined") return "unsupported";
	if (!window.isSecureContext) return "insecure-context";

	if (
		"serviceWorker" in navigator &&
		"PushManager" in window &&
		"Notification" in window
	) {
		return "supported";
	}

	if (isIosDevice() && !isInstalledApp()) return "ios-needs-install";

	return "unsupported";
}

/**
 * Pide el permiso **en el mismo tick del gesto** (D126): el navegador solo
 * enseña su diálogo si la llamada llega con la activación del clic todavía
 * vigente, así que aquí no puede haber nada asíncrono antes de
 * `Notification.requestPermission()`.
 *
 * Si el permiso ya está decidido (`granted` o `denied`) no se pregunta: el
 * navegador tampoco lo haría, y así el resultado es el mismo en todos.
 *
 * Safari antiguo solo acepta la forma con callback (y devuelve `undefined`):
 * se atienden las dos.
 */
function requestPermissionWithinGesture(): Promise<NotificationPermission> {
	if (Notification.permission !== "default") {
		return Promise.resolve(Notification.permission);
	}

	return new Promise((resolve, reject) => {
		try {
			const pending = Notification.requestPermission(resolve);
			pending?.then(resolve, reject);
		} catch (error) {
			reject(error);
		}
	});
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const timeoutId = window.setTimeout(
			() => reject(new Error(`Timed out after ${ms} ms`)),
			ms,
		);

		promise.then(
			(value) => {
				window.clearTimeout(timeoutId);
				resolve(value);
			},
			(error: unknown) => {
				window.clearTimeout(timeoutId);
				reject(error);
			},
		);
	});
}

/**
 * Suscribe este dispositivo (ya con permiso) y guarda la suscripción vía la
 * Edge Function `subscribe-push` (no se toca la tabla `push_subscriptions`
 * directo desde el cliente — ver `supabase/notifications.sql`).
 */
async function saveSubscription(userId: string | null): Promise<boolean> {
	const publicKey = import.meta.env.PUBLIC_VAPID_PUBLIC_KEY;
	if (!publicKey) {
		console.error(
			"Daily reminder: PUBLIC_VAPID_PUBLIC_KEY is not set, cannot subscribe.",
		);
		return false;
	}

	const registration = await withTimeout(
		navigator.serviceWorker.ready,
		SERVICE_WORKER_READY_TIMEOUT_MS,
	);

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

	if (error) {
		console.error("Daily reminder: subscribe-push failed:", error);
		return false;
	}

	return true;
}

/**
 * Cómo acabó el intento de activar el recordatorio (D127):
 *
 * - `subscribed`: permiso concedido y suscripción guardada.
 * - `dismissed`: se cerró el diálogo del navegador sin elegir.
 * - `denied`: el permiso está bloqueado (ahora o de antes).
 * - `failed`: con permiso, pero no se pudo suscribir (sin clave VAPID, SW que
 *   no responde, Edge Function caída...).
 * - el resto: el motivo de `getNotificationSupport` por el que ni se preguntó.
 */
export type DailyReminderResult =
	| "subscribed"
	| "dismissed"
	| "denied"
	| "failed"
	| Exclude<NotificationSupport, "supported">;

/**
 * Pide permiso de notificaciones y, si se concede, suscribe este dispositivo.
 *
 * **Tiene que llamarse directamente desde el manejador del clic**, sin nada
 * `await` antes: por eso esta función no es `async` y su primera acción
 * asíncrona es la propia petición de permiso (D126).
 *
 * Nunca lanza: es una mejora best-effort, el resultado dice qué pasó para que
 * la interfaz lo pueda explicar.
 */
export function subscribeToDailyReminder(
	userId: string | null,
): Promise<DailyReminderResult> {
	const support = getNotificationSupport();
	if (support !== "supported") return Promise.resolve(support);

	return requestPermissionWithinGesture()
		.then(async (permission): Promise<DailyReminderResult> => {
			if (permission === "denied") return "denied";
			if (permission !== "granted") return "dismissed";

			return (await saveSubscription(userId)) ? "subscribed" : "failed";
		})
		.catch((error: unknown): DailyReminderResult => {
			console.error("Failed to subscribe to daily reminder:", error);
			return "failed";
		});
}
