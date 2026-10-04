-- Fun Life: Supabase 스키마 초안 (로그인 붙일 때 사용, 아직 앱에 연결되지 않음)
--
-- 카드 하나의 그래프(nodes/edges)는 항상 통째로 읽고 쓰므로 jsonb 한 컬럼에 둔다.
-- 나중에 "사람들이 '달리기'에서 많이 찾은 감정" 같은 집계가 필요해지면
-- nodes를 별도 테이블로 정규화하면 된다.

create table public.action_cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null default 'action' check (kind in ('action', 'money')),
  title       text not null check (char_length(title) between 1 and 40),
  graph       jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index action_cards_user_id_idx on public.action_cards (user_id, updated_at desc);

-- 돈 카드는 유저당 하나
create unique index action_cards_one_money_card on public.action_cards (user_id) where kind = 'money';

-- 본인 카드만 읽고 쓸 수 있다
alter table public.action_cards enable row level security;

create policy "own cards" on public.action_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
