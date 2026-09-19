# Supabase

World Flags uses [Supabase](https://supabase.com) for authentication, cloud-synced
progress, the public leaderboard and push-notification reminders.

**The database schema, RLS policies and edge functions are kept private** and are not
part of this repository. Everything in this folder except this README is gitignored.

## What you need to run the app locally

The client only needs the public variables listed in [`.env.example`](../.env.example):

| Variable | Required | What it is |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Yes | Your project's public anon key |
| `PUBLIC_VAPID_PUBLIC_KEY` | No | Public VAPID key, only needed to test push notifications |

Both required variables must be set or the app fails to start (the Supabase client is
created at import time). Pointing them at an empty Supabase project is enough for UI
work in guest mode (progress in `localStorage`); features that depend on the private
schema — account sync, leaderboard, achievements, push reminders — won't work there.

## Need the schema?

If you're working on a feature that touches the backend, open an issue describing what
you need and the maintainer will share the relevant setup with you.

## For maintainers

- SQL scripts and edge functions live in this folder **locally only**. Run SQL changes
  manually in the Supabase SQL editor and deploy functions with the Supabase CLI.
- Never commit secrets: service role key, VAPID private key and `CRON_SECRET` go in
  `supabase secrets set`, never in the repo.
