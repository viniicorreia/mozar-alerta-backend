-- updated_at triggers for every table that has the column.
create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.candidates
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.news
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.instagram_sources
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
