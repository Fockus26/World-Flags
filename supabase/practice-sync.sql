-- Sincronización del candado diario y las mejores marcas de tiempo.
--
-- Hasta ahora `last_practice_by_country` (qué países se practicaron hoy) y
-- `region_best_times` (mejor tiempo de "rush" por continente/mundo) solo
-- vivían en localStorage: al recargar en una cuenta autenticada,
-- `fetchRemoteLearningData` los devolvía vacíos y se perdía el candado
-- diario. Estas columnas los suben a Supabase junto al resto de
-- `user_learning_data`.
--
-- Correr este script una sola vez en el SQL Editor de Supabase
-- (https://supabase.com/dashboard/project/_/sql/new).

alter table public.user_learning_data
	add column if not exists last_practice_by_country jsonb not null default '{}'::jsonb,
	add column if not exists region_best_times jsonb not null default '{}'::jsonb;
