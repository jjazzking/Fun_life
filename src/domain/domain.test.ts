import { describe, expect, it } from 'vitest';
import { cardStatus, createCard, createMoneyCard } from './card';
import { isComplete, nodesOnCompletePaths, validateConnection } from './graph';
import { findMoneyTerm } from './money';
import type { ActionCard, MeaningEdge, MeaningNode } from './types';

const edge = (source: string, target: string): MeaningEdge => ({ id: `${source}-${target}`, source, target });
const node = (id: string, kind: MeaningNode['kind'] = 'value'): MeaningNode => ({
  id,
  kind,
  label: id,
  position: { x: 0, y: 0 },
});
const withGraph = (card: ActionCard, extra: MeaningNode[], edges: MeaningEdge[]): ActionCard => ({
  ...card,
  nodes: [...card.nodes, ...extra],
  edges,
});

describe('findMoneyTerm', () => {
  it('돈/경제적 성공 관련 단어를 찾는다', () => {
    expect(findMoneyTerm('돈을 아낀다')).toBe('돈');
    expect(findMoneyTerm('연 봉 상승')).toBe('연봉');
    expect(findMoneyTerm('Make MONEY')).toBe('money');
    expect(findMoneyTerm('경제적 자유')).toBe('경제적');
  });

  it('감정/효용 표현은 돈으로 보지 않는다', () => {
    expect(findMoneyTerm('숨이 차오르는 개운함')).toBeNull();
    expect(findMoneyTerm('친구와 돈독해짐')).toBeNull();
    expect(findMoneyTerm('작은 성공의 기쁨')).toBeNull();
  });
});

describe('validateConnection', () => {
  const nodes = [node('action', 'action'), node('fun', 'fun'), node('a'), node('b'), node('c'), node('m', 'money')];

  it('출발점 → 재미 직결을 막는다', () => {
    expect(validateConnection(nodes, [], 'action', 'fun')).toBe('direct-to-fun');
  });

  it('방향 규칙을 지킨다', () => {
    expect(validateConnection(nodes, [], 'a', 'action')).toBe('into-action');
    expect(validateConnection(nodes, [], 'fun', 'a')).toBe('out-of-fun');
  });

  it('돈 박스는 도착점이다', () => {
    expect(validateConnection(nodes, [], 'action', 'm')).toBeNull();
    expect(validateConnection(nodes, [], 'm', 'a')).toBe('out-of-money');
  });

  it('중복과 순환을 막는다', () => {
    const edges = [edge('a', 'b'), edge('b', 'c')];
    expect(validateConnection(nodes, edges, 'a', 'b')).toBe('duplicate');
    expect(validateConnection(nodes, edges, 'c', 'a')).toBe('cycle');
    expect(validateConnection(nodes, edges, 'a', 'c')).toBeNull();
  });
});

describe('완성 판정', () => {
  it('출발점에서 재미까지 경로가 있으면 완성', () => {
    expect(isComplete([edge('action', 'a')])).toBe(false);
    expect(isComplete([edge('action', 'a'), edge('a', 'b'), edge('b', 'fun')])).toBe(true);
  });

  it('돈 박스를 거치면 돈 카드가 완성돼야 재미에 닿는다', () => {
    const action = withGraph(createCard('일하기'), [node('a'), node('m', 'money')], [edge('action', 'a'), edge('a', 'm')]);
    const emptyMoney = createMoneyCard();
    const doneMoney = withGraph(emptyMoney, [node('x')], [edge('action', 'x'), edge('x', 'fun')]);

    expect(cardStatus(createCard('일하기'), null)).toBe('pending');
    expect(cardStatus(action, null)).toBe('waiting-money');
    expect(cardStatus(action, emptyMoney)).toBe('waiting-money');
    expect(cardStatus(action, doneMoney)).toBe('via-money');
  });

  it('돈 카드가 완성됐을 때만 돈 박스 경로를 하이라이트한다', () => {
    const nodes = [node('action', 'action'), node('fun', 'fun'), node('a'), node('m', 'money')];
    const edges = [edge('action', 'a'), edge('a', 'm')];
    expect(nodesOnCompletePaths(nodes, edges, false).size).toBe(0);
    expect([...nodesOnCompletePaths(nodes, edges, true)].sort()).toEqual(['a', 'action', 'm']);
  });
});
