-- Modo de juego "Países" (rama experimental `feat/modo-paises`): progreso de
-- aprendizaje separado del de Banderas.
--
-- Banderas sigue viviendo en las columnas de siempre (`country_history`,
-- `region_game_scores`, `region_best_times`, `last_practice_by_country`).
-- Países guarda su propio historial de repetición espaciada, puntajes de
-- práctica, mejores tiempos de rush y candado de "practicado hoy" en una
-- única columna nueva, con la misma forma que las de arriba pero anidada:
--
-- `countries_game` -> {
--   "countryHistory": { "<code>": { "review": {...} | null } },
--   "regionGameScores": { "<region>": [n, n, n] },
--   "regionBestTimes": { "<region|world>": ms },
--   "lastPracticeByCountry": { "<code>": "YYYY-MM-DD" }
-- }
--
-- Lo compartido entre los dos juegos (perfil, última configuración, logros,
-- estadísticas, historial de sesiones) no se toca: ya vive en sus columnas.
--
-- Correr este script una sola vez en el SQL Editor de Supabase
-- (https://supabase.com/dashboard/project/_/sql/new).
--
-- IMPORTANTE: correrlo ANTES de desplegar el cliente que lo usa. Si el cliente
-- pide esta columna y todavía no existe, el `select` de
-- `fetchRemoteLearningData` falla, `syncOnLogin` lanza, y el usuario
-- autenticado cae al fallback de localStorage en vez de ver su progreso de la
-- nube (mismo riesgo que `achievements.sql`).

alter table public.user_learning_data
	add column if not exists countries_game jsonb not null default '{}'::jsonb;
