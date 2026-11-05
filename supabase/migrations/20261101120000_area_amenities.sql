-- Optional amenity details for an area. Null means unknown or not applicable, never "no".
-- For example, a null phone_policy_id means the area has no stated phone policy.

create table public.phone_policy (
  phone_policy_id smallint primary key,
  label text not null unique
);

insert into public.phone_policy (phone_policy_id, label) values
  (0, 'No Phone Calls Allowed'),
  (1, 'Quiet Phone Calls Only'),
  (2, 'Phone Calls Allowed');

-- Reference data, like outlet_level: anyone can read, only admins write.
alter table public.phone_policy enable row level security;
create policy "Anyone can read" on public.phone_policy
  for select to anon, authenticated using (true);
create policy "Admins can write" on public.phone_policy
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.area
  add column phone_policy_id smallint references public.phone_policy (phone_policy_id),
  add column time_limit_minutes integer check (time_limit_minutes > 0),
  add column wheelchair_accessible boolean;

create index area_phone_policy_id_idx on public.area (phone_policy_id);

comment on column public.area.phone_policy_id is
  'Whether phone calls are allowed in the area. Null when there is no stated policy.';
comment on column public.area.time_limit_minutes is
  'How long someone may stay, in minutes. Null when there is no limit or it is unknown.';
comment on column public.area.wheelchair_accessible is
  'True or false when known. Null when unknown.';
