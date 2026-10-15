-- Run once in your Supabase project's SQL Editor. No existing data is deleted.
create table if not exists public.app_admins(user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.app_settings(key text primary key,value jsonb);
create table if not exists public.research_cache(key text primary key,payload jsonb not null,expires timestamptz not null);
create table if not exists public.watchlist(user_id uuid not null references auth.users(id) on delete cascade,listing_id text not null,payload jsonb not null,created_at timestamptz not null default now(),primary key(user_id,listing_id));
create table if not exists public.listing_snapshots(key text primary key,listing_id text not null,captured_at timestamptz not null,payload jsonb not null);
create table if not exists public.request_limits(user_id uuid not null references auth.users(id) on delete cascade,minute bigint not null,count integer not null,primary key(user_id,minute));
create index if not exists snapshots_listing_time on public.listing_snapshots(listing_id,captured_at desc);
create index if not exists cache_expiration on public.research_cache(expires);
alter table public.app_admins enable row level security;
alter table public.app_settings enable row level security;
alter table public.research_cache enable row level security;
alter table public.watchlist enable row level security;
alter table public.listing_snapshots enable row level security;
alter table public.request_limits enable row level security;
revoke all on public.app_admins,public.app_settings,public.research_cache,public.listing_snapshots,public.request_limits from anon,authenticated;
revoke all on public.watchlist from anon,authenticated;
grant select,insert,update,delete on public.app_admins,public.app_settings,public.research_cache,public.watchlist,public.listing_snapshots,public.request_limits to service_role;
-- Legacy Etsy payloads are unavailable to browser tokens; cleanup is an explicit owner action.
drop policy if exists watchlist_read_own on public.watchlist;
create or replace function public.research_rate_limit(request_user_id uuid) returns integer language plpgsql security definer set search_path=public as $$
declare current_minute bigint := floor(extract(epoch from now())/60); requests integer;
begin
 insert into public.request_limits(user_id,minute,count) values(request_user_id,current_minute,1)
 on conflict(user_id,minute) do update set count=request_limits.count+1 returning count into requests;
 delete from public.request_limits where minute<current_minute-2;
 return requests;
end; $$;
revoke all on function public.research_rate_limit(uuid) from public,anon,authenticated;
grant execute on function public.research_rate_limit(uuid) to service_role;
-- Enforce the 100-item watchlist cap even when requests arrive simultaneously.
create or replace function public.enforce_watchlist_limit() returns trigger language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtext(new.user_id::text));
 if not exists(select 1 from public.watchlist where user_id=new.user_id and listing_id=new.listing_id)
 and (select count(*) from public.watchlist where user_id=new.user_id)>=100 then
 raise exception 'Watchlist limit reached';
 end if;
 return new;
end; $$;
drop trigger if exists watchlist_limit on public.watchlist;
create trigger watchlist_limit before insert on public.watchlist for each row execute function public.enforce_watchlist_limit();
