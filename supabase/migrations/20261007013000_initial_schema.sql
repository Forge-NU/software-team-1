-- Spotted initial schema (ERD v2)

-- ---------------------------------------------------------------------------
-- Lookup tables
-- ---------------------------------------------------------------------------

create table public.location_type (
  name text primary key
);

create table public.campus (
  name text primary key
);

create table public.price_range (
  price_range_id smallint primary key,
  label text not null unique
);

create table public.day (
  name text primary key
);

create table public.seat_type (
  name text primary key
);

create table public.capacity (
  capacity_id smallint primary key,
  label text not null unique
);

create table public.outlet_level (
  outlet_level_id smallint primary key,
  label text not null unique
);

create table public.crowd_level (
  crowd_level_id smallint primary key,
  label text not null unique
);

create table public.noise_level (
  noise_level_id smallint primary key,
  label text not null unique
);

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------

create table public.users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  user_type text not null default 'student' check (user_type in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create table public.follow (
  follower_id uuid not null default auth.uid() references public.users (user_id) on delete cascade,
  following_id uuid not null references public.users (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follow_following_id_idx on public.follow (following_id);

-- ---------------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------------

create table public.location (
  location_id bigint generated always as identity primary key,
  google_place_id text unique,
  name text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location_type text not null references public.location_type (name) on update cascade,
  campus text references public.campus (name) on update cascade on delete set null,
  price_range_id smallint references public.price_range (price_range_id)
);

create index location_location_type_idx on public.location (location_type);
create index location_campus_idx on public.location (campus);
create index location_price_range_id_idx on public.location (price_range_id);

create table public.address (
  location_id bigint primary key references public.location (location_id) on delete cascade,
  street_one text,
  street_two text,
  city text,
  region text,
  postal_code text,
  country_code text check (country_code ~ '^[A-Z]{2}$')
);

create table public.day_hours (
  location_id bigint not null references public.location (location_id) on delete cascade,
  day text not null references public.day (name) on update cascade,
  open_time time not null,
  close_time time not null,
  primary key (location_id, day)
);

comment on column public.day_hours.close_time is
  'A close_time earlier than open_time means the location closes after midnight. 00:00-24:00 means open all day.';

create table public.area (
  area_id bigint generated always as identity primary key,
  location_id bigint not null references public.location (location_id) on delete cascade,
  name text not null,
  floor text,
  noise_policy text,
  unique (area_id, location_id)
);

create index area_location_id_idx on public.area (location_id);

create table public.seating_area (
  seating_id bigint generated always as identity primary key,
  location_id bigint not null references public.location (location_id) on delete cascade,
  area_id bigint,
  name text not null,
  seat_type text not null references public.seat_type (name) on update cascade,
  capacity_id smallint not null references public.capacity (capacity_id),
  outlet_level_id smallint not null references public.outlet_level (outlet_level_id),
  near_window boolean not null default false,
  reservable boolean not null default false,
  -- The area must belong to the same location as the seating area.
  foreign key (area_id, location_id)
    references public.area (area_id, location_id)
    on delete set null (area_id)
);

create index seating_area_location_id_idx on public.seating_area (location_id);
create index seating_area_area_id_idx on public.seating_area (area_id);

create table public.overall_ratings (
  seating_id bigint primary key references public.seating_area (seating_id) on delete cascade,
  average_rating numeric(3, 2),
  noise_rating numeric(3, 2),
  wifi_rating numeric(3, 2),
  comfort_rating numeric(3, 2),
  review_count integer not null default 0 check (review_count >= 0)
);

-- ---------------------------------------------------------------------------
-- User-generated content
-- ---------------------------------------------------------------------------

create table public.review (
  review_id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.users (user_id) on delete cascade,
  seating_id bigint not null references public.seating_area (seating_id) on delete cascade,
  overall_rating smallint not null check (overall_rating between 1 and 5),
  noise_rating smallint check (noise_rating between 1 and 5),
  wifi_rating smallint check (wifi_rating between 1 and 5),
  comfort_rating smallint check (comfort_rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index review_user_id_idx on public.review (user_id);
create index review_seating_id_idx on public.review (seating_id);

create table public.photo (
  photo_id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.users (user_id) on delete cascade,
  seating_id bigint not null references public.seating_area (seating_id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index photo_user_id_idx on public.photo (user_id);
create index photo_seating_id_idx on public.photo (seating_id);

create table public.check_in (
  checkin_id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.users (user_id) on delete cascade,
  seating_id bigint not null references public.seating_area (seating_id) on delete cascade,
  crowd_level_id smallint not null references public.crowd_level (crowd_level_id),
  noise_level_id smallint references public.noise_level (noise_level_id),
  wifi_mbps real check (wifi_mbps >= 0),
  checked_in_at timestamptz not null default now()
);

create index check_in_user_id_idx on public.check_in (user_id);
create index check_in_seating_id_checked_in_at_idx on public.check_in (seating_id, checked_in_at desc);

create table public.flag (
  flag_id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.users (user_id) on delete cascade,
  review_id bigint references public.review (review_id) on delete cascade,
  photo_id bigint references public.photo (photo_id) on delete cascade,
  reported_user_id uuid references public.users (user_id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  check (num_nonnulls(review_id, photo_id) <= 1),
  check (num_nonnulls(review_id, photo_id, reported_user_id) >= 1)
);

create index flag_user_id_idx on public.flag (user_id);
create index flag_review_id_idx on public.flag (review_id);
create index flag_photo_id_idx on public.flag (photo_id);
create index flag_reported_user_id_idx on public.flag (reported_user_id);
create index flag_status_idx on public.flag (status);

-- ---------------------------------------------------------------------------
-- Functions and triggers
-- ---------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where user_id = (select auth.uid()) and user_type = 'admin'
  );
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (user_id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.refresh_overall_ratings(p_seating_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.overall_ratings (
    seating_id, average_rating, noise_rating, wifi_rating, comfort_rating, review_count
  )
  select
    s.seating_id,
    round(avg(r.overall_rating), 2),
    round(avg(r.noise_rating), 2),
    round(avg(r.wifi_rating), 2),
    round(avg(r.comfort_rating), 2),
    count(r.review_id)
  from public.seating_area s
  left join public.review r on r.seating_id = s.seating_id
  where s.seating_id = p_seating_id
  group by s.seating_id
  on conflict (seating_id) do update set
    average_rating = excluded.average_rating,
    noise_rating = excluded.noise_rating,
    wifi_rating = excluded.wifi_rating,
    comfort_rating = excluded.comfort_rating,
    review_count = excluded.review_count;
$$;

create function public.handle_review_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.refresh_overall_ratings(old.seating_id);
  end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.seating_id <> old.seating_id) then
    perform public.refresh_overall_ratings(new.seating_id);
  end if;
  return null;
end;
$$;

create trigger on_review_change
  after insert or update or delete on public.review
  for each row execute function public.handle_review_change();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.refresh_overall_ratings(bigint) from public, anon, authenticated;
revoke execute on function public.handle_review_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

-- Reference data and the location catalog: anyone can read, only admins write.
do $$
declare
  t text;
begin
  foreach t in array array[
    'location_type', 'campus', 'price_range', 'day', 'seat_type', 'capacity',
    'outlet_level', 'crowd_level', 'noise_level',
    'location', 'address', 'day_hours', 'area', 'seating_area'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Anyone can read" on public.%I for select to anon, authenticated using (true)', t
    );
    execute format(
      'create policy "Admins can write" on public.%I for all to authenticated '
      'using ((select public.is_admin())) with check ((select public.is_admin()))', t
    );
  end loop;
end;
$$;

-- overall_ratings is maintained by the review trigger only.
alter table public.overall_ratings enable row level security;
create policy "Anyone can read" on public.overall_ratings
  for select to anon, authenticated using (true);

alter table public.users enable row level security;
create policy "Signed-in users can read profiles" on public.users
  for select to authenticated using (true);
create policy "Users can update their own profile" on public.users
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- Rows are created by handle_new_user; user_type is only changeable with the service role.
revoke insert, update, delete on public.users from anon, authenticated;
grant update (name) on public.users to authenticated;

alter table public.review enable row level security;
create policy "Anyone can read" on public.review
  for select to anon, authenticated using (true);
create policy "Users can create their own reviews" on public.review
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users can update their own reviews" on public.review
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users and admins can delete reviews" on public.review
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

alter table public.photo enable row level security;
create policy "Anyone can read" on public.photo
  for select to anon, authenticated using (true);
create policy "Users can upload their own photos" on public.photo
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users and admins can delete photos" on public.photo
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

alter table public.check_in enable row level security;
create policy "Anyone can read" on public.check_in
  for select to anon, authenticated using (true);
create policy "Users can create their own check-ins" on public.check_in
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users can delete their own check-ins" on public.check_in
  for delete to authenticated using (user_id = (select auth.uid()));

alter table public.flag enable row level security;
create policy "Reporters and admins can read flags" on public.flag
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Users can submit flags" on public.flag
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy "Admins can update flags" on public.flag
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete flags" on public.flag
  for delete to authenticated using ((select public.is_admin()));

alter table public.follow enable row level security;
create policy "Signed-in users can read follows" on public.follow
  for select to authenticated using (true);
create policy "Users can follow others" on public.follow
  for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "Users can unfollow" on public.follow
  for delete to authenticated using (follower_id = (select auth.uid()));
