-- Optional amenity details for an area. Null means unknown or not applicable, never "no".
-- For example, a null phone_policy means the area has no stated policy.

alter table public.area
  add column phone_policy text,
  add column time_limit_minutes integer check (time_limit_minutes > 0),
  add column wheelchair_accessible boolean;

comment on column public.area.phone_policy is
  'Free-text rule on phone use, e.g. "Silent mode only". Null when there is no stated policy.';
comment on column public.area.time_limit_minutes is
  'How long someone may stay, in minutes. Null when there is no limit or it is unknown.';
comment on column public.area.wheelchair_accessible is
  'True or false when known. Null when unknown.';
