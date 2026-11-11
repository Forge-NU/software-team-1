-- B-6: saved spots. A user's bookmarked locations, for the Saved tab (F-9)
-- and the bookmark button on Spot Detail.

create table public.saved_spot (
  user_id uuid not null default auth.uid() references public.users (user_id) on delete cascade,
  location_id bigint not null references public.location (location_id) on delete cascade,
  created_at timestamptz not null default now(),
  -- One row per user per spot, so saving twice can never duplicate.
  primary key (user_id, location_id)
);

-- The primary key already covers lookups by user; this covers deletes of a location.
create index saved_spot_location_id_idx on public.saved_spot (location_id);

-- RLS: users can only read, add and remove their own saves. There is no
-- update policy because a save has nothing to change.
alter table public.saved_spot enable row level security;

create policy "Users can read their own saves" on public.saved_spot
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users can save spots as themselves" on public.saved_spot
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users can remove their own saves" on public.saved_spot
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.saved_spot from anon, authenticated;
grant select, insert, delete on public.saved_spot to authenticated;
