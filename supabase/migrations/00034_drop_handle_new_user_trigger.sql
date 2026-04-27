-- ============================================================
-- Drop handle_new_user trigger to remove the user_metadata trust path
-- ============================================================
--
-- Why:
-- The trigger seeded public.users from auth.users.raw_user_meta_data,
-- reading tenant_id and role from a column the end user can write to via
-- supabase.auth.updateUser({ data: { ... } }). If anyone ever enabled a
-- public signup path (auth.signUp() or OAuth) the trigger would let an
-- attacker mint themselves into an arbitrary tenant with arbitrary role.
--
-- The custom_access_token_hook already sources tenant_id / role from
-- public.users, so we lose nothing by making the application code the
-- single writer of public.users. All three creation paths (signupAction,
-- createTenant, inviteUser) already insert into public.users themselves
-- with server-controlled values, so dropping the trigger is safe.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
