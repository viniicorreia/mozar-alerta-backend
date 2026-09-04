-- Row Level Security policies. See docs/architecture.md#schema for the
-- rationale behind each one. `service_role` (used by apps/api) bypasses RLS
-- entirely and is not mentioned below.

-- users --------------------------------------------------------------
alter table public.users enable row level security;

create policy "self read" on public.users for select
  using (id = auth.uid() or public.is_admin_or_moderator());

create policy "self update limited" on public.users for update
  using (id = auth.uid());
  -- role/status changes are rejected at the application layer (service_role only)

create policy "admin manage" on public.users for all
  using (public.current_role() = 'ADMIN');

alter table public.user_consents enable row level security;
create policy "self manage consents" on public.user_consents for all
  using (user_id = auth.uid());

-- candidates -----------------------------------------------------------
alter table public.candidates enable row level security;
create policy "self manage" on public.candidates for all
  using (user_id = auth.uid() or public.is_admin_or_moderator());

create policy "company read for applicants" on public.candidates for select
  using (
    exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.companies c on c.id = j.company_id
      where a.candidate_id = candidates.id and c.user_id = auth.uid()
    )
  );

alter table public.candidate_education enable row level security;
create policy "self manage education" on public.candidate_education for all
  using (exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));

alter table public.candidate_experience enable row level security;
create policy "self manage experience" on public.candidate_experience for all
  using (exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));

-- companies --------------------------------------------------------------
alter table public.companies enable row level security;

create policy "public read active" on public.companies for select
  using (status = 'active' or user_id = auth.uid() or public.is_admin_or_moderator());

create policy "owner insert" on public.companies for insert
  with check (user_id = auth.uid());

create policy "owner update own" on public.companies for update
  using (user_id = auth.uid());
  -- status/verified_at changes are rejected at the application layer (service_role only)

create policy "admin manage all" on public.companies for all
  using (public.current_role() = 'ADMIN');

-- categories --------------------------------------------------------------
alter table public.categories enable row level security;
create policy "public read active" on public.categories for select
  using (active or public.is_admin_or_moderator());
create policy "admin manage" on public.categories for all
  using (public.current_role() = 'ADMIN');

-- news --------------------------------------------------------------
alter table public.news enable row level security;
create policy "public read published" on public.news for select
  using ((status = 'published' and deleted_at is null) or public.is_admin_or_moderator());
create policy "moderator write" on public.news for all
  using (public.current_role() in ('ADMIN', 'MODERATOR'));

-- instagram_sources -- SENSITIVE: no policies for authenticated/anon on purpose.
alter table public.instagram_sources enable row level security;

-- instagram_posts --------------------------------------------------------------
alter table public.instagram_posts enable row level security;
create policy "moderator read/write" on public.instagram_posts for all
  using (public.is_admin_or_moderator());

-- jobs --------------------------------------------------------------
alter table public.jobs enable row level security;

create policy "public read published" on public.jobs for select
  using (
    (status = 'published' and deleted_at is null)
    or exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid())
    or public.is_admin_or_moderator()
  );

create policy "company manage own" on public.jobs for all
  using (exists (
    select 1 from public.companies c
    where c.id = company_id and c.user_id = auth.uid()
      and c.status = 'active' and c.verified_at is not null
  ));

create policy "admin manage all" on public.jobs for all
  using (public.current_role() = 'ADMIN');

-- resumes --------------------------------------------------------------
alter table public.resumes enable row level security;

create policy "self manage" on public.resumes for all
  using (exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));

create policy "company read via application" on public.resumes for select
  using (exists (
    select 1 from public.applications a
    join public.companies c on c.id = a.company_id
    where a.resume_id = resumes.id and c.user_id = auth.uid()
  ));

create policy "admin read" on public.resumes for select
  using (public.is_admin_or_moderator());

-- applications --------------------------------------------------------------
alter table public.applications enable row level security;

create policy "candidate read own" on public.applications for select
  using (exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));

create policy "candidate create own" on public.applications for insert
  with check (exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));

create policy "candidate withdraw own" on public.applications for update
  using (exists (select 1 from public.candidates c where c.id = candidate_id and c.user_id = auth.uid()));

create policy "company read own" on public.applications for select
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

create policy "company update status" on public.applications for update
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

create policy "admin manage" on public.applications for all
  using (public.current_role() = 'ADMIN');

alter table public.application_status_history enable row level security;
create policy "history read" on public.application_status_history for select
  using (exists (
    select 1 from public.applications a
    left join public.candidates c on c.id = a.candidate_id
    left join public.companies co on co.id = a.company_id
    where a.id = application_id and (c.user_id = auth.uid() or co.user_id = auth.uid())
  ));
create policy "history insert" on public.application_status_history for insert
  with check (public.current_role() in ('COMPANY', 'ADMIN', 'CANDIDATE'));

-- events --------------------------------------------------------------
alter table public.events enable row level security;
create policy "public read published" on public.events for select
  using ((status = 'published' and deleted_at is null) or public.is_admin_or_moderator());
create policy "moderator manage" on public.events for all
  using (public.is_admin_or_moderator());

-- notifications --------------------------------------------------------------
alter table public.notifications enable row level security;
create policy "self read" on public.notifications for select
  using (user_id = auth.uid());
create policy "self mark read" on public.notifications for update
  using (user_id = auth.uid());

-- audit_log --------------------------------------------------------------
alter table public.audit_log enable row level security;
create policy "admin read" on public.audit_log for select
  using (public.current_role() = 'ADMIN');
