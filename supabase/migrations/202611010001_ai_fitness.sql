-- Apply after the existing websites, submissions and user_roles schema.
create table public.ai_business_settings (
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 website_id uuid not null references public.websites(id) on delete cascade,
 business_name text not null default '', services text not null default '', prices text not null default '',
 opening_hours text not null default '', tone text not null default 'Friendly and professional',
 ai_enabled boolean not null default false, approved_exercises text[] not null default '{}',
 primary key (owner_id, website_id)
);
create table public.fitness_members (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 website_id uuid not null references public.websites(id) on delete cascade,
 name text not null check (length(name) between 1 and 120), goal text not null,
 experience text not null check (experience in ('beginner','intermediate','advanced')),
 equipment text not null default '', days_per_week integer not null check (days_per_week between 1 and 6),
 session_minutes integer not null check (session_minutes between 10 and 120),
 ai_consent boolean not null default false, trainer_clearance boolean not null default false,
 created_at timestamptz not null default now(), unique (id, owner_id)
);
create table public.fitness_workout_logs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 member_id uuid not null, performed_on date not null, exercise text not null,
 minutes integer not null check (minutes between 1 and 300), sets integer not null check (sets between 0 and 20),
 reps integer not null check (reps between 0 and 1000), weight_kg numeric check (weight_kg between 0 and 1000),
 notes text not null default '', created_at timestamptz not null default now(),
 foreign key (member_id, owner_id) references public.fitness_members(id, owner_id) on delete cascade
);
create index on public.fitness_workout_logs (member_id, performed_on);
create table public.ai_results (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 website_id uuid not null references public.websites(id) on delete cascade,
 cache_key text not null, action text not null, model text not null, result jsonb not null,
 evidence jsonb not null default '{}', created_at timestamptz not null default now(), unique (owner_id, cache_key)
);
create table public.ai_usage_events (
 id bigint generated always as identity primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index on public.ai_usage_events (owner_id, created_at);
alter table public.ai_business_settings enable row level security;
alter table public.fitness_members enable row level security;
alter table public.fitness_workout_logs enable row level security;
alter table public.ai_results enable row level security;
alter table public.ai_usage_events enable row level security;
create policy "Own business settings" on public.ai_business_settings for all to authenticated
 using (owner_id = auth.uid()) with check (owner_id = auth.uid() and exists (select 1 from public.websites w where w.id = website_id and (w.owner_id = auth.uid() or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin'))));
create policy "Own fitness members" on public.fitness_members for all to authenticated
 using (owner_id = auth.uid()) with check (owner_id = auth.uid() and exists (select 1 from public.websites w where w.id = website_id and (w.owner_id = auth.uid() or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'admin'))));
create policy "Own workout logs" on public.fitness_workout_logs for all to authenticated
 using (owner_id = auth.uid()) with check (owner_id = auth.uid() and exists (select 1 from public.fitness_members m where m.id = member_id and m.owner_id = auth.uid()));
create policy "Own AI results" on public.ai_results for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Read own AI usage" on public.ai_usage_events for select to authenticated using (owner_id = auth.uid());
-- Atomic per-user reservations work across server processes. Cached responses are free.
create function public.reserve_ai_request() returns boolean language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
 if caller is null then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
 if (select count(*) from public.ai_usage_events where owner_id = caller and created_at > now() - interval '1 minute') >= 5
 or (select count(*) from public.ai_usage_events where owner_id = caller and created_at > now() - interval '24 hours') >= 50 then return false; end if;
 insert into public.ai_usage_events(owner_id) values (caller);
 delete from public.ai_usage_events where owner_id = caller and created_at < now() - interval '7 days';
 return true;
end;
$$;
revoke all on function public.reserve_ai_request() from public, anon;
grant execute on function public.reserve_ai_request() to authenticated;
revoke insert, update, delete on public.ai_usage_events from anon, authenticated;
