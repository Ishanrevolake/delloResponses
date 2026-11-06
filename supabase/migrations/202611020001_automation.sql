-- Apply after 202611010001_ai_fitness.sql. Automation starts disabled.
create table public.automation_settings (
 website_id uuid primary key references public.websites(id) on delete cascade,
 enabled boolean not null default false, enabled_at timestamptz,
 owner_email text not null default 'liamruth96@hotmail.co.uk',
 enquiry_days integer not null default 4 check(enquiry_days between 1 and 30),
 weekly_enabled boolean not null default true, followups_enabled boolean not null default true,
 updated_at timestamptz not null default now(), last_run_at timestamptz, last_run_error text
);
create table public.automation_clients (
 id uuid primary key default gen_random_uuid(), website_id uuid not null references public.websites(id) on delete cascade,
 source_submission_id uuid references public.submissions(id) on delete set null,
 name text not null, email text not null check(email=lower(btrim(email))), enquiry_at timestamptz,
 status text not null default 'open' check(status in ('open','converted','closed')),
 do_not_contact boolean not null default false, enquiry_followup_done boolean not null default false,
 membership_end_date date, membership_status text not null default 'active' check(membership_status in ('active','renewed','cancelled')),
 created_at timestamptz not null default now(), unique(website_id,source_submission_id)
);
create index on public.automation_clients(website_id,created_at);
create table public.automation_deliveries (
 id uuid primary key default gen_random_uuid(), website_id uuid not null references public.websites(id) on delete cascade,
 client_id uuid references public.automation_clients(id) on delete cascade,
 kind text not null check(kind in ('enquiry','membership','weekly')), dedupe_key text not null,
 recipient text not null, subject text not null, body text not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed','unknown','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), claimed_at timestamptz, sent_at timestamptz, error text,
 provider_id text, unique(website_id,dedupe_key)
);
create index on public.automation_deliveries(website_id,status,created_at);
-- Users may manage only sites they own, or sites accessible through the existing admin role.
create function public.can_manage_automation(site uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.websites w where w.id=site and (w.owner_id=auth.uid() or exists(select 1 from public.user_roles r where r.user_id=auth.uid() and r.role='admin')));
$$;
revoke all on function public.can_manage_automation(uuid) from public,anon;
grant execute on function public.can_manage_automation(uuid) to authenticated;
alter table public.automation_settings enable row level security;
alter table public.automation_clients enable row level security;
alter table public.automation_deliveries enable row level security;
create policy "Manage site automation settings" on public.automation_settings for all to authenticated using(public.can_manage_automation(website_id)) with check(public.can_manage_automation(website_id));
create policy "Manage site automation clients" on public.automation_clients for all to authenticated using(public.can_manage_automation(website_id)) with check(public.can_manage_automation(website_id));
create policy "Read site delivery history" on public.automation_deliveries for select to authenticated using(public.can_manage_automation(website_id));
-- Outbox mutations are restricted to server workers, not browser clients.
revoke insert,update,delete on public.automation_deliveries from anon,authenticated;
-- Prevent accidentally enabling direct browser-created settings without a start timestamp.
alter table public.automation_settings add constraint enabled_requires_start check(not enabled or enabled_at is not null);
-- Serialize claims per site and guard duplicate recipient records.
create or replace function public.claim_automation_delivery(site uuid) returns setof public.automation_deliveries language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(site::text,11));
 update public.automation_deliveries d set status='cancelled',error='Another follow-up to this recipient was attempted in the last seven days.'
 where d.website_id=site and d.status='pending' and d.kind<>'weekly' and exists(
  select 1 from public.automation_deliveries old where old.website_id=site and old.id<>d.id and old.kind<>'weekly'
  and lower(old.recipient)=lower(d.recipient) and old.status in ('sent','failed','unknown')
  and coalesce(old.sent_at,old.created_at)>now()-interval '7 days');
 return query update public.automation_deliveries set status='sending',claimed_at=now()
 where id=(select d.id from public.automation_deliveries d where d.website_id=site and d.status='pending'
  and (d.kind='weekly' or not exists(select 1 from public.automation_deliveries busy where busy.website_id=site and busy.id<>d.id and busy.kind<>'weekly' and busy.status='sending' and lower(busy.recipient)=lower(d.recipient)))
  order by case when d.kind='weekly' then 0 else 1 end,d.created_at,d.id for update skip locked limit 1)
 returning *;
end;
$$;
revoke all on function public.claim_automation_delivery(uuid) from public,anon,authenticated;
grant execute on function public.claim_automation_delivery(uuid) to service_role;

create function public.touch_automation_delivery() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
create trigger automation_delivery_updated before update on public.automation_deliveries for each row execute function public.touch_automation_delivery();
