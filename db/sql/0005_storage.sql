-- Storage buckets and policies. Buckets themselves are created via the
-- Supabase CLI/dashboard (private=true for 'resumes', public=true for
-- 'covers' and 'avatars') — this file only adds the RLS policies on
-- storage.objects.

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

-- Path convention: resumes/{candidate_user_id}/{uuid}.pdf
create policy "candidate own folder" on storage.objects for all
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "company read via application" on storage.objects for select
  using (
    bucket_id = 'resumes'
    and exists (
      select 1 from public.resumes r
      join public.applications a on a.resume_id = r.id
      join public.companies c on c.id = a.company_id
      where r.file_key = storage.objects.name and c.user_id = auth.uid()
    )
  );

create policy "public read covers" on storage.objects for select
  using (bucket_id = 'covers');

create policy "moderator write covers" on storage.objects for insert
  with check (bucket_id = 'covers' and public.is_admin_or_moderator());
