-- Enforces the application status state-machine at the DB level, since a
-- plain RLS `with check` can't compare against the previous row's value.
-- Candidates may only move their own application to 'withdrawn'; companies
-- may not reopen a withdrawn application.
create or replace function public.guard_application_status_transition()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  actor_role text := public.current_role();
  is_candidate boolean;
  is_company boolean;
begin
  if actor_role = 'ADMIN' then
    return new;
  end if;

  select exists (
    select 1 from public.candidates c
    where c.id = new.candidate_id and c.user_id = auth.uid()
  ) into is_candidate;

  select exists (
    select 1 from public.companies c
    where c.id = new.company_id and c.user_id = auth.uid()
  ) into is_company;

  if is_candidate and new.status is distinct from old.status then
    if new.status <> 'withdrawn' then
      raise exception 'candidates may only withdraw an application';
    end if;
  elsif is_company and old.status = 'withdrawn' and new.status <> 'withdrawn' then
    raise exception 'companies may not reopen a withdrawn application';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_application_status_transition on public.applications;
create trigger guard_application_status_transition
  before update on public.applications
  for each row execute function public.guard_application_status_transition();
