-- Apply in Supabase SQL Editor before resubmission. This changes access only; no rows are deleted.
revoke all on public.watchlist,public.research_cache,public.listing_snapshots from anon,authenticated;
drop policy if exists watchlist_read_own on public.watchlist;
-- Retained legacy rows can be removed through the owner’s separately confirmed Etsy-data cleanup.
