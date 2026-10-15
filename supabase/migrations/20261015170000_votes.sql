-- One vote per user per post. The primary key enforces it.
create table public.vote (
  post_id bigint not null references public.post (post_id) on delete cascade,
  user_id uuid not null default auth.uid() references public.users (user_id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index vote_user_id_idx on public.vote (user_id);

-- Blocks voting on your own post and keeps updated_at current.
create function public.handle_vote_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.post p
    where p.post_id = new.post_id and p.user_id = new.user_id
  ) then
    raise exception 'You can''t vote on your own post.' using errcode = 'P0001';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_vote_write
  before insert or update on public.vote
  for each row execute function public.handle_vote_write();

revoke execute on function public.handle_vote_write() from public, anon, authenticated;

-- RLS: users can only read and write their own votes.
alter table public.vote enable row level security;

create policy "Users can read their own votes" on public.vote
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users can vote as themselves" on public.vote
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users can change their own votes" on public.vote
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users can remove their own votes" on public.vote
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.vote from anon, authenticated;
grant select, insert, update, delete on public.vote to authenticated;

-- Vote totals per post, plus the caller's own vote. security_invoker = false lets
-- the totals count other users' votes even though RLS hides those rows (the
-- Supabase linter will flag this; it's intentional). my_vote filters on auth.uid().
create view public.post_vote_summary
with (security_invoker = false) as
select
  p.post_id,
  p.location_id,
  coalesce(v.upvotes, 0)::int   as upvotes,
  coalesce(v.downvotes, 0)::int as downvotes,
  coalesce(v.score, 0)::int     as vote_score,
  (select mv.value from public.vote mv
    where mv.post_id = p.post_id and mv.user_id = (select auth.uid())) as my_vote
from public.post p
left join (
  select post_id,
         count(*) filter (where value =  1) as upvotes,
         count(*) filter (where value = -1) as downvotes,
         sum(value)                         as score
  from public.vote
  group by post_id
) v on v.post_id = p.post_id;

revoke all on public.post_vote_summary from public, anon;
grant select on public.post_vote_summary to authenticated;

-- Cast (1 / -1), change, or remove (0) the caller's vote.
create function public.cast_vote(p_post_id bigint, p_value smallint)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'You must be signed in to vote.';
  end if;
  if p_post_id is null then
    raise exception 'Invalid post_id: must not be null.';
  end if;
  if p_value is null or p_value not in (-1, 0, 1) then
    raise exception 'Invalid vote value: %. Must be -1, 0 (remove), or 1.', p_value;
  end if;

  if p_value = 0 then
    delete from public.vote where post_id = p_post_id and user_id = v_user;
  else
    insert into public.vote (post_id, user_id, value)
    values (p_post_id, v_user, p_value)
    on conflict (post_id, user_id) do update set value = excluded.value;
  end if;
end;
$$;

revoke execute on function public.cast_vote(bigint, smallint) from public, anon;
grant execute on function public.cast_vote(bigint, smallint) to authenticated;