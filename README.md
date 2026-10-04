# Fun Life

실존주의 기반 자기개발 앱. 어떤 행동이든, 그 행동 **자체**가 주는 감정과 효용을 따라가면 결국 **재미**에 닿는다는 것을 스스로 그려보게 한다.

## 핵심 규칙

1. 카드는 **행동 하나**마다 만든다.
2. 새 카드에는 **행동 박스**와 **재미 박스**만 있다.
3. 유저는 그 행동이 주는 **감정 / 효용 박스**를 만들고, 행동 → … → 재미로 이어지게 연결한다.
4. **돈, 경제적 성공**은 어떤 박스에도 들어갈 수 없다.

## 구조

```
src/
  domain/            ← 규칙이 사는 곳 (UI·저장소와 무관, 테스트 대상)
    types.ts           ActionCard / MeaningNode / MeaningEdge
    card.ts            새 카드 생성 (규칙 2)
    graph.ts           연결 규칙 · 완성 판정 (규칙 3)
    forbidden.ts       금지어 필터 (규칙 4)
  storage/           ← 저장소 추상화
    repository.ts      CardRepository 인터페이스
    localRepository.ts 지금: 브라우저 localStorage
    index.ts           나중에: 로그인 시 Supabase 구현으로 교체
  components/
    MeaningNodeView.tsx 박스 렌더링 (행동/감정/효용/재미)
  pages/
    CardListPage.tsx   카드 목록 · 생성
    CardEditorPage.tsx 의미 그래프 편집기 (React Flow)
  router.ts          해시 라우팅 (#/, #/card/:id) — GitHub Pages용
supabase/schema.sql  로그인 붙일 때 쓸 테이블 · RLS · 금지어 트리거
```

### 연결 규칙 (`src/domain/graph.ts`)

| 규칙 | 이유 |
| --- | --- |
| 행동 → 재미 직결 금지 | "그냥 재밌어"가 아니라 그 사이의 감정/효용을 찾게 하는 게 핵심 |
| 행동으로 들어오는 선, 재미에서 나가는 선 금지 | 방향은 항상 행동 → 재미 |
| 중복·순환 금지 | 그래프를 읽기 쉽게 유지 |
| 행동에서 재미까지 경로가 생기면 **완성** | 경로 위의 박스·선이 하이라이트됨 |

### 금지어 (`src/domain/forbidden.ts`)

- 띄어쓰기·대소문자를 무시하고 부분 일치로 검사한다 (`연 봉` → `연봉`).
- `돈독`, `돈가스`처럼 오탐되는 단어는 예외 목록으로 처리한다.
- Supabase 연동 후에는 DB 트리거로 한 번 더 막는다 (클라이언트 우회 방지).

## 개발

```bash
npm install
npm run dev     # 로컬 개발 서버
npm test        # 도메인 규칙 테스트
npm run build   # dist/ 생성
```

## 배포 (GitHub Pages)

`main`에 push하면 `.github/workflows/deploy.yml`이 테스트 → 빌드 → Pages 배포를 한다.
처음 한 번: 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 설정.

## 로그인 붙이기 (나중에)

1. Supabase 프로젝트 생성 → `supabase/schema.sql` 실행
2. `@supabase/supabase-js` 설치, `SupabaseCardRepository implements CardRepository` 작성
   (`graph` 컬럼에 `{ nodes, edges }` 저장)
3. `src/storage/index.ts`에서 세션 유무에 따라 Local / Supabase 구현을 고르기
4. 첫 로그인 시 localStorage 카드를 Supabase로 옮기기
5. anon key는 공개돼도 되는 키라 Pages에 넣어도 됨 (보안은 RLS가 담당)
