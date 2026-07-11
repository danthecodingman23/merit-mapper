create table if not exists public.saved_scholarships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scholarship_id text not null,
  scholarship_name text not null,
  amount integer,
  application_url text,
  saved_at timestamptz not null default now(),
  unique(user_id, scholarship_id)
);

alter table public.saved_scholarships enable row level security;

create policy "Users can view their own saved scholarships"
  on public.saved_scholarships for select
  using (auth.uid() = user_id);

create policy "Users can save scholarships"
  on public.saved_scholarships for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave their own scholarships"
  on public.saved_scholarships for delete
  using (auth.uid() = user_id);

grant select, insert, delete on table public.saved_scholarships to authenticated;
