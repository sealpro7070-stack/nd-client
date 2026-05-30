-- SECURITY FIX (CRITICAL): lock down SECURITY DEFINER RPCs.
-- Applied to project ylkodhiaxllbbblbfmxs on 2026-05-31.
--
-- BEFORE this migration, `add_credits` and `grant_plan` (both SECURITY DEFINER)
-- were EXECUTE-able by the `anon` and `authenticated` roles. The anon key is
-- public (baked into the frontend bundle), so anyone could call:
--   POST /rest/v1/rpc/grant_plan  { target_user_id, target_plan: 'family' }
--   POST /rest/v1/rpc/add_credits { target_user_id, amount: 100000 }
-- and grant themselves a paid plan / unlimited credits — bypassing payments.
--
-- The frontend never calls these RPCs; only the Express backend does, using the
-- service_role key (which bypasses these grants). Revoking anon/authenticated
-- EXECUTE is therefore safe and breaks nothing.

-- Money / plan mutators — service_role only
revoke execute on function public.add_credits(uuid, integer) from public, anon, authenticated;
revoke execute on function public.grant_plan(uuid, text, integer) from public, anon, authenticated;

-- Stats reader takes an arbitrary user_id → could leak other users' stats
revoke execute on function public.get_submission_stats(uuid, integer, integer, timestamptz) from public, anon, authenticated;

-- Trigger functions should never be invoked directly via the REST RPC surface
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.handle_auth_user_created() from public, anon, authenticated;

-- Pin search_path on SECURITY DEFINER / trigger functions to prevent
-- search_path hijacking (Supabase linter 0011).
alter function public.add_credits(uuid, integer) set search_path = public, pg_temp;
alter function public.grant_plan(uuid, text, integer) set search_path = public, pg_temp;
alter function public.get_submission_stats(uuid, integer, integer, timestamptz) set search_path = public, pg_temp;
alter function public.enforce_max_family_slots() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.handle_new_auth_user() set search_path = public, pg_temp;
alter function public.handle_auth_user_created() set search_path = public, pg_temp;
