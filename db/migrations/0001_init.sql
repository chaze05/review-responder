do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    raise exception 'Create the app_user role (NOSUPERUSER NOBYPASSRLS) before running this migration.';
  end if;

  if exists (
    select 1 from pg_roles
    where rolname = 'app_user' and (rolsuper or rolbypassrls)
  ) then
    raise exception 'app_user must not be a superuser or have BYPASSRLS.';
  end if;
end
$$;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create unique index users_email_lower_idx on public.users (lower(email));

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  business_name text not null default '',
  review_text text not null,
  rating smallint,
  tone text not null default 'friendly',
  reply_text text not null,
  created_at timestamptz not null default now(),
  constraint reviews_business_name_length check (char_length(business_name) <= 100),
  constraint reviews_review_text_length check (char_length(review_text) between 20 and 1500),
  constraint reviews_reply_text_length check (char_length(reply_text) between 1 and 600),
  constraint reviews_rating_range check (rating is null or rating between 1 and 5),
  constraint reviews_tone_values check (tone in ('friendly', 'professional', 'apologetic'))
);

create index reviews_user_created_idx on public.reviews (user_id, created_at desc);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at);

create table public.auth_attempts (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);

create index auth_attempts_key_created_idx on public.auth_attempts (key, created_at);

create schema if not exists app;

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

alter table public.reviews enable row level security;
alter table public.reviews force row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_usage force row level security;

create policy "reviews_select_own"
  on public.reviews for select
  using (app.current_user_id() = user_id);

create policy "reviews_insert_own"
  on public.reviews for insert
  with check (app.current_user_id() = user_id);

create policy "reviews_delete_own"
  on public.reviews for delete
  using (app.current_user_id() = user_id);

create policy "ai_usage_select_own"
  on public.ai_usage for select
  using (app.current_user_id() = user_id);

create policy "ai_usage_insert_own"
  on public.ai_usage for insert
  with check (app.current_user_id() = user_id);

create policy "ai_usage_delete_own_old"
  on public.ai_usage for delete
  using (
    app.current_user_id() = user_id
    and created_at < now() - interval '7 days'
  );

create or replace function app.create_user(p_email text, p_password_hash text)
returns table (id uuid, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  insert into public.users (email, password_hash)
  values (lower(trim(p_email)), p_password_hash)
  returning users.id, users.email;
end;
$$;

create or replace function app.get_user_for_login(p_email text)
returns table (id uuid, email text, password_hash text)
language sql
security definer
set search_path = public
stable
as $$
  select users.id, users.email, users.password_hash
  from public.users
  where lower(users.email) = lower(trim(p_email));
$$;

create or replace function app.record_auth_attempt(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_key));

  delete from public.auth_attempts
  where created_at < now() - interval '1 day';

  select count(*) into recent
  from public.auth_attempts
  where key = p_key
    and created_at >= now() - make_interval(secs => p_window_seconds);

  if recent >= p_limit then
    return false;
  end if;

  insert into public.auth_attempts (key) values (p_key);
  return true;
end;
$$;

revoke all on public.users from public;
revoke all on public.auth_attempts from public;
revoke execute on function app.create_user(text, text) from public;
revoke execute on function app.get_user_for_login(text) from public;
revoke execute on function app.record_auth_attempt(text, integer, integer) from public;

revoke all on public.users from app_user;
revoke all on public.auth_attempts from app_user;
grant usage on schema app, public to app_user;
grant select, insert, delete on public.reviews, public.ai_usage to app_user;
grant execute on function app.create_user(text, text) to app_user;
grant execute on function app.get_user_for_login(text) to app_user;
grant execute on function app.record_auth_attempt(text, integer, integer) to app_user;
