-- Fun Life: Supabase 스키마 초안 (로그인 붙일 때 사용, 아직 앱에 연결되지 않음)
--
-- 카드 하나의 그래프(nodes/edges)는 항상 통째로 읽고 쓰므로 jsonb 한 컬럼에 둔다.
-- 나중에 "사람들이 '달리기'에서 많이 찾은 감정" 같은 집계가 필요해지면
-- nodes를 별도 테이블로 정규화하면 된다.

create table public.action_cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 40),
  graph       jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index action_cards_user_id_idx on public.action_cards (user_id, updated_at desc);

-- 본인 카드만 읽고 쓸 수 있다
alter table public.action_cards enable row level security;

create policy "own cards" on public.action_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 규칙 4의 서버 측 방어선: 금지어가 들어간 제목/박스는 저장 거부.
-- (클라이언트 src/domain/forbidden.ts 목록과 동기화할 것)
create or replace function public.reject_money_terms() returns trigger
language plpgsql as $$
declare
  forbidden text[] := array['돈', '연봉', '월급', '수입', '부자', '재테크', '투자', '경제적',
                            'money', 'salary', 'income', 'wealth', 'profit'];
  texts text := lower(new.title || ' ' || coalesce(
    (select string_agg(n->>'label', ' ') from jsonb_array_elements(new.graph->'nodes') n), ''));
  term text;
begin
  texts := replace(replace(replace(texts, '돈독', ''), '돈가스', ''), '돈까스', '');
  foreach term in array forbidden loop
    if position(term in texts) > 0 then
      raise exception 'forbidden term: %', term;
    end if;
  end loop;
  new.updated_at := now();
  return new;
end $$;

create trigger action_cards_reject_money
  before insert or update on public.action_cards
  for each row execute function public.reject_money_terms();
