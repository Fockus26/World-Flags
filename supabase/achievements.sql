-- Sistema de logros: logros desbloqueados, estadísticas acumuladas e
-- historial de sesiones.
--
-- Hasta ahora todo lo que ocurría dentro de una sesión (aciertos, fallos,
-- skips, tiempo jugado y, sobre todo, qué días se practicó) se descartaba al
-- terminar: solo sobrevivían el estado de repetición espaciada, los puntajes
-- por continente y las mejores marcas. Sin esos hechos no hay logros de
-- hábito (rachas) ni de precisión.
--
-- - `achievements`   -> { "<id>": { "unlockedAt": ISO, "seenAt": ISO | null } }
-- - `stats`          -> contadores acumulados + `activeDays` (YYYY-MM-DD local)
-- - `session_history`-> últimas 25 sesiones (práctica, competitivo y diaria)
--
-- Correr este script una sola vez en el SQL Editor de Supabase
-- (https://supabase.com/dashboard/project/_/sql/new).
--
-- IMPORTANTE: correrlo ANTES de desplegar el cliente que lo usa. Si el cliente
-- pide estas columnas y todavía no existen, el `select` de
-- `fetchRemoteLearningData` falla, `syncOnLogin` lanza, y el usuario
-- autenticado cae al fallback de localStorage en vez de ver su progreso de la
-- nube.

alter table public.user_learning_data
	add column if not exists achievements jsonb not null default '{}'::jsonb,
	add column if not exists stats jsonb not null default '{}'::jsonb,
	add column if not exists session_history jsonb not null default '[]'::jsonb;
