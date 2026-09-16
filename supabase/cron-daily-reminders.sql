-- Cron que dispara la Edge Function `send-daily-reminders` una vez por hora.
-- Correr DESPUÉS de:
--   1. `notifications.sql` (tabla `push_subscriptions`)
--   2. desplegar `subscribe-push` y `send-daily-reminders` (sin `verify_jwt`)
--   3. `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:... CRON_SECRET=<una cadena larga al azar>`
--
-- Reemplaza `<project-ref>` y `<CRON_SECRET>` con los reales (el mismo
-- `CRON_SECRET` que le pusiste a la función en el paso 3 — NO el service role
-- key: la función ya no lo exige, valida este secreto propio contra el header
-- `Authorization`, así no hace falta guardar la service role key dentro de
-- `cron.job`, que cualquiera con acceso de lectura al catálogo puede ver).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
	'send-daily-reminders',
	'0 * * * *', -- cada hora, en punto (UTC)
	$$
	select net.http_post(
		url := 'https://<project-ref>.supabase.co/functions/v1/send-daily-reminders',
		headers := jsonb_build_object(
			'Content-Type', 'application/json',
			'Authorization', 'Bearer <CRON_SECRET>'
		),
		body := '{}'::jsonb
	);
	$$
);

-- Para desprogramarlo más adelante: select cron.unschedule('send-daily-reminders');
