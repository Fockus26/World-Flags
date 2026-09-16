-- Notificaciones: recordatorio diario (Web Push) + respuesta al snackbar de
-- opt-in.
--
-- - `user_learning_data.daily_reminder` -> { "answered": bool, "optedIn": bool,
--   "answeredAt": ISO | null }. Se sincroniza como el resto del perfil (una
--   sola respuesta, cualquier dispositivo, nunca se vuelve a preguntar).
-- - `push_subscriptions` -> una fila POR DISPOSITIVO (no por cuenta: cada
--   navegador tiene su propia suscripción Push). `user_id` es nullable a
--   propósito: cubre tanto usuarios autenticados como invitados (identificados
--   solo por `device_id`, generado en el cliente y guardado en su propio
--   `localStorage`, ver `getOrCreateDeviceId` en `learning-storage.ts`).
--
-- Correr este script una sola vez en el SQL Editor de Supabase
-- (https://supabase.com/dashboard/project/_/sql/new), ANTES de desplegar el
-- cliente de esta unidad. Mismo riesgo que ya describen `achievements.sql` y
-- `countries-game.sql`: si el cliente pide `daily_reminder` y todavía no
-- existe, el `select` de `fetchRemoteLearningData` falla y el usuario
-- autenticado cae al fallback de localStorage.

alter table public.user_learning_data
	add column if not exists daily_reminder jsonb not null default '{}'::jsonb;

create table if not exists public.push_subscriptions (
	device_id text primary key,
	user_id uuid references auth.users (id) on delete cascade,
	endpoint text not null unique,
	p256dh text not null,
	auth_key text not null,
	timezone text not null default 'UTC',
	-- Hora local (0-23) en la que se quiere el recordatorio. Sin selector en
	-- el cliente todavía (ver decisión pendiente en CURRENT_PHASE.md): se
	-- guarda la hora local del momento en que el usuario aceptó.
	reminder_hour smallint not null default 19,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- RLS habilitada y SIN políticas para `anon`/`authenticated`: por diseño,
-- nada de esta tabla se lee ni se escribe directo desde el cliente. El
-- cliente solo habla con las Edge Functions `subscribe-push` (alta/
-- actualización) y `send-daily-reminders` (el cron las lee), que usan la
-- service role key y por tanto se saltan RLS. La alternativa (RLS abierta a
-- `anon` filtrando por `device_id`) no es verificable por Postgres: no hay
-- forma de comprobar que quien manda la request es realmente el dueño de ese
-- `device_id` sin una función que ya haga ese trabajo — así que se optó por
-- la función en vez de una política que en la práctica dejaría leer/escribir
-- la fila de cualquiera que conozca (o adivine) un `device_id`.
alter table public.push_subscriptions enable row level security;
