-- Leaderboard público de modo competitivo ("rush").
--
-- No reutiliza `user_learning_data` (esa tabla es privada por usuario, ver
-- TODO.md) — esta es una tabla nueva, de solo lo necesario para el ranking
-- (nombre + mejor tiempo), pensada para ser legible por cualquiera.
--
-- Correr este script una sola vez en el SQL Editor de Supabase
-- (https://supabase.com/dashboard/project/_/sql/new).

create table if not exists public.leaderboard_entries (
	user_id uuid not null references auth.users (id) on delete cascade,
	-- "world" hoy; podría ser el código de un continente ("europe", etc.) en
	-- el futuro para rankings por continente, sin necesitar otra migración.
	scope text not null,
	display_name text not null,
	best_time_ms integer not null,
	updated_at timestamptz not null default now(),
	primary key (user_id, scope)
);

create index if not exists leaderboard_entries_scope_time_idx on public.leaderboard_entries (scope, best_time_ms);

alter table public.leaderboard_entries enable row level security;

-- Cualquiera puede leer el ranking (incluso sin iniciar sesión).
drop policy if exists "Leaderboard is publicly readable" on public.leaderboard_entries;
create policy "Leaderboard is publicly readable"
on public.leaderboard_entries for select
to anon, authenticated
using (true);

-- Cada usuario solo puede crear/actualizar su propia fila.
drop policy if exists "Users can upsert their own leaderboard entry" on public.leaderboard_entries;
create policy "Users can upsert their own leaderboard entry"
on public.leaderboard_entries for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own leaderboard entry" on public.leaderboard_entries;
create policy "Users can update their own leaderboard entry"
on public.leaderboard_entries for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
