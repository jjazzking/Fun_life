import { describe, expect, it } from 'vitest';
import { findForbiddenTerm } from './forbidden';
import { isComplete, validateConnection } from './graph';
import type { MeaningEdge } from './types';

const edge = (source: string, target: string): MeaningEdge => ({ id: `${source}-${target}`, source, target });

describe('findForbiddenTerm', () => {
  it('돈/경제적 성공 관련 단어를 찾는다', () => {
    expect(findForbiddenTerm('돈을 아낀다')).toBe('돈');
    expect(findForbiddenTerm('연 봉 상승')).toBe('연봉');
    expect(findForbiddenTerm('Make MONEY')).toBe('money');
    expect(findForbiddenTerm('경제적 자유')).toBe('경제적');
  });

  it('감정/효용 표현은 통과시킨다', () => {
    expect(findForbiddenTerm('숨이 차오르는 개운함')).toBeNull();
    expect(findForbiddenTerm('친구와 돈독해짐')).toBeNull();
    expect(findForbiddenTerm('작은 성취감')).toBeNull();
  });
});

describe('validateConnection', () => {
  it('행동 → 재미 직결을 막는다', () => {
    expect(validateConnection([], 'action', 'fun')).toBe('direct-to-fun');
  });

  it('방향 규칙을 지킨다', () => {
    expect(validateConnection([], 'a', 'action')).toBe('into-action');
    expect(validateConnection([], 'fun', 'a')).toBe('out-of-fun');
  });

  it('중복과 순환을 막는다', () => {
    const edges = [edge('a', 'b'), edge('b', 'c')];
    expect(validateConnection(edges, 'a', 'b')).toBe('duplicate');
    expect(validateConnection(edges, 'c', 'a')).toBe('cycle');
    expect(validateConnection(edges, 'a', 'c')).toBeNull();
  });
});

describe('isComplete', () => {
  it('행동에서 재미까지 경로가 있으면 완성', () => {
    expect(isComplete([edge('action', 'a')])).toBe(false);
    expect(isComplete([edge('action', 'a'), edge('a', 'b'), edge('b', 'fun')])).toBe(true);
  });
});
