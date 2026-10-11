-- Supabase's optional automatic RLS trigger lives in public. Its event-trigger
-- function needs to run for DDL, but clients must not have RPC EXECUTE rights.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
