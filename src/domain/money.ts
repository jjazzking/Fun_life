/**
 * 규칙 4: 돈은 금지하지 않는다. 대신 특별하게 다룬다.
 *
 * 행동 카드 안에서 돈과 관련된 박스를 만들면 그 박스는 '돈 박스'가 되고,
 * 그 너머는 행동 카드와 같은 계층의 '돈 카드' 하나에서 따로 재미까지 이어야 한다.
 * 이 파일은 텍스트가 돈/경제적 성공에 관한 것인지 판별만 한다.
 */

const MONEY_TERMS: string[] = [
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
const NOT_MONEY: string[] = ['돈독', '돈가스', '돈까스', '코인노래', '재정비'];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s\-_.·,]/g, '');
}

/** 돈 관련 단어가 있으면 해당 단어를, 없으면 null을 반환 */
export function findMoneyTerm(text: string): string | null {
  let normalized = normalize(text);
  for (const allowed of NOT_MONEY) {
    normalized = normalized.split(allowed).join('');
  }
  for (const term of MONEY_TERMS) {
    if (normalized.includes(normalize(term))) return term;
  }
  return null;
}
