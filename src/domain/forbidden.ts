/**
 * 규칙 4: '돈 / 경제적 성공' 키워드 차단.
 *
 * 노드 라벨은 행동이 주는 직접적인 감정과 인간적인 효용만 담아야 한다.
 * 클라이언트에서 1차 차단하고, Supabase 연동 시 DB 트리거로 2차 차단한다
 * (supabase/schema.sql 참고).
 */

const FORBIDDEN_TERMS: string[] = [
  // 한국어
  '돈', '현금', '수입', '소득', '월급', '연봉', '급여', '보너스', '부자', '재산', '재테크',
  '투자', '수익', '매출', '부업', '용돈', '저축', '자산', '주식', '코인',
  '비트코인', '부동산', '경제적', '금전', '재정', '파이어', '은퇴자금', '몸값', '승진',
  '출세', '돈벌',
  // 영어
  'money', 'cash', 'income', 'salary', 'wage', 'wealth', 'profit', 'revenue',
  'invest', 'stock', 'crypto', 'bitcoin', 'dollar', 'financial', 'finance', 'promotion',
  'paycheck', 'bonus',
  // 기호
  '$', '₩', '€', '¥', '£',
];

/** '돈'처럼 짧은 단어가 다른 단어 일부로 쓰여도 오탐되지 않게 예외를 둔다. */
const ALLOWED_CONTAINING: string[] = ['돈독', '돈가스', '돈까스', '코인노래', '재정비'];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s\-_.·,]/g, '');
}

/** 금지어가 있으면 해당 단어를, 없으면 null을 반환 */
export function findForbiddenTerm(text: string): string | null {
  let normalized = normalize(text);
  for (const allowed of ALLOWED_CONTAINING) {
    normalized = normalized.split(allowed).join('');
  }
  for (const term of FORBIDDEN_TERMS) {
    if (normalized.includes(normalize(term))) return term;
  }
  return null;
}
