-- Helper functions used by RLS policies across the schema.
-- Applied after drizzle-kit migrations (see src/migrate.ts).

create or replace function public.current_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role::text from public.users where id = auth.uid()
$$;

create or replace function public.is_admin_or_moderator()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.current_role() in ('ADMIN', 'MODERATOR')
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- auth.users -> public.users mirror
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'USER',
    'pending_verification'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
