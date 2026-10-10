alter table public.email_verification_tokens enable row level security;
revoke all on table public.users from public, anon, authenticated;
revoke all on table public.email_verification_tokens from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
