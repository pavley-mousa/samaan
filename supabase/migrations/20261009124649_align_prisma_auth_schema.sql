drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop trigger if exists protect_profile_role on public.profiles;
drop function if exists public.prevent_role_escalation();

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists users_role_check;
alter table public.profiles rename to users;
alter table public.users rename column full_name to name;

do $$ begin create type public."UserRole" as enum ('CUSTOMER', 'ADMIN'); exception when duplicate_object then null; end $$;
do $$ begin create type public."UserStatus" as enum ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED'); exception when duplicate_object then null; end $$;

alter table public.users
  alter column name type varchar(120) using coalesce(name, '')::varchar(120),
  alter column name set not null,
  add column email varchar(254),
  add column password_hash varchar(255),
  add column status text not null default 'PENDING_VERIFICATION',
  add column email_verified_at timestamptz;

update public.users set role = upper(role);

alter table public.users
  alter column role drop default,
  alter column status drop default,
  alter column role type public."UserRole" using role::public."UserRole",
  alter column role set default 'CUSTOMER',
  alter column status type public."UserStatus" using status::public."UserStatus",
  alter column status set default 'PENDING_VERIFICATION',
  alter column email set not null,
  alter column password_hash set not null;

create unique index if not exists users_email_key on public.users(email);
create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  token_hash varchar(64) not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists email_verification_tokens_expires_at_idx on public.email_verification_tokens(expires_at);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'ADMIN'::public."UserRole");
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.users enable row level security;
drop policy if exists "Users read own profile or admins read all" on public.users;
drop policy if exists "Users update own profile or admins update all" on public.users;
create policy "Users read own record or admins read all" on public.users for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Users update own record or admins update all" on public.users for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.email_verification_tokens to authenticated;
