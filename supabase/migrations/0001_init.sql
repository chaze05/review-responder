create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at);

alter table public.reviews enable row level security;
alter table public.ai_usage enable row level security;

grant select, insert, delete on public.reviews to authenticated;
grant select, insert, delete on public.ai_usage to authenticated;

revoke all on public.reviews from anon;
revoke all on public.ai_usage from anon;

create policy "reviews_select_own"
  on public.reviews for select
  to authenticated
  using (auth.uid() = user_id);

create policy "reviews_insert_own"
  on public.reviews for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "reviews_delete_own"
  on public.reviews for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "ai_usage_select_own"
  on public.ai_usage for select
  to authenticated
  using (auth.uid() = user_id);

create policy "ai_usage_insert_own"
  on public.ai_usage for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "ai_usage_delete_own"
  on public.ai_usage for delete
  to authenticated
  using (auth.uid() = user_id);
