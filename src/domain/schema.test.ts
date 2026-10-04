import { describe, expect, it } from 'vitest';
import { createCard, createMoneyCard, createWorryCard, statusLabel } from './card';
import { buildReflectionPrompt, renderSchemaText } from './reflectionPrompt';
import { buildFunSchema } from './schema';
import type { ActionCard, MeaningNode } from './types';

const box = (id: string, label: string, kind: MeaningNode['kind'] = 'value', category: MeaningNode['category'] = 'emotion'): MeaningNode => ({
  id,
  kind,
  label,
  category: kind === 'value' ? category : undefined,
  position: { x: 0, y: 0 },
});

function card(base: ActionCard, nodes: MeaningNode[], links: [string, string][]): ActionCard {
  return {
    ...base,
    nodes: [...base.nodes, ...nodes],
    edges: links.map(([source, target]) => ({ id: `${source}-${target}`, source, target })),
  };
}

const running: ActionCard = card(
  createCard('아침 달리기'),
  [box('a', '개운함'), box('b', '몸이 가벼워짐', 'value', 'utility'), box('c', '외로움')],
  [['action', 'a'], ['action', 'b'], ['a', 'fun'], ['b', 'fun']],
);
const work = card(
  createCard('야근하기'),
  [box('a', '개운 함'), box('m', '연봉 상승', 'money')],
  [['action', 'a'], ['a', 'm']],
);
const money = card(createMoneyCard(), [box('x', '고를 수 있는 자유')], [['action', 'x'], ['x', 'fun']]);

const kneeBase = createWorryCard('무릎이 상할까');
const knee = card(
  kneeBase,
  [box('f', '아직 아프진 않다', 'value', 'fact'), box('p', '오래 달리고 싶다', 'value', 'protects'), box('n', '나이', 'value', 'notMine')],
  [['action', 'f'], ['f', 'p'], ['p', 'fun']],
);
knee.nodes = knee.nodes.map((n) => (n.id === 'fun' ? { ...n, note: '천천히라도 매일 달린다' } : n));
const lonely = createWorryCard('혼자 뒤처질까');

// 아침 달리기의 '개운함'에서 무릎 걱정이 생겨났다
running.nodes.push({ ...box('w', '무릎이 상할까', 'worry'), linkedCardId: knee.id });
running.edges.push({ id: 'a-w', source: 'a', target: 'w' });

describe('buildFunSchema', () => {
  const schema = buildFunSchema([lonely, money, work, knee, running], new Date('2026-10-04T00:00:00Z'));

  it('행동 카드, 돈 카드, 걱정 카드 순으로 둔다', () => {
    expect(schema.cards.map((c) => c.title)).toEqual(['야근하기', '아침 달리기', '돈', '혼자 뒤처질까', '무릎이 상할까']);
  });

  it('카드를 경로로 펼친다', () => {
    const runningCard = schema.cards[1];
    expect(runningCard.paths.map((p) => p.map((s) => s.label))).toEqual([
      ['아침 달리기', '개운함', '재미'],
      ['아침 달리기', '개운함', '무릎이 상할까'],
      ['아침 달리기', '몸이 가벼워짐', '재미'],
    ]);
    expect(runningCard.unconnected).toEqual([{ label: '외로움', kind: 'emotion' }]);
    expect(schema.cards[0].paths[0].at(-1)).toEqual({ label: '연봉 상승', kind: 'money' });
  });

  it('요약을 계산한다', () => {
    expect(schema.summary).toMatchObject({
      actionCards: 2,
      connectedCards: 2,
      viaMoneyCards: 1,
      emotionBoxes: 3,
      utilityBoxes: 1,
      moneyBoxes: 1,
      moneyRewardActions: ['야근하기'],
      worryBoxes: 1,
      worryCards: 2,
      resolvedWorryCards: 1,
    });
    // 띄어쓰기만 다른 박스는 같은 것으로 본다
    expect(schema.summary.recurring).toEqual([{ label: '개운 함', cards: ['야근하기', '아침 달리기'] }]);
  });

  it('걱정 카드에 생겨난 곳과 그럼에도를 담는다', () => {
    const kneeCard = schema.cards.find((c) => c.title === '무릎이 상할까')!;
    expect(kneeCard.origins).toEqual([{ card: '아침 달리기', from: '개운함' }]);
    expect(kneeCard.resolve).toBe('천천히라도 매일 달린다');
    expect(kneeCard.unconnected).toEqual([{ label: '나이', kind: 'notMine' }]);
    expect(statusLabel(kneeCard.status, 'worry')).toBe('그럼에도에 닿았어요');
    expect(schema.cards.find((c) => c.title === '혼자 뒤처질까')!.origins).toEqual([]);
  });

  it('프롬프트에 도식이 들어간다', () => {
    const text = renderSchemaText(schema);
    expect(text).toContain('- 아침 달리기 → [효용] 몸이 가벼워짐 → 재미');
    expect(text).toContain('- 야근하기 → [감정] 개운 함 → [돈] 연봉 상승');
    expect(text).toContain('아직 어디에도 잇지 못한 박스: [감정] 외로움');
    expect(text).toContain('- 돈을 보상(도착점)으로 둔 행동: 야근하기');
    expect(text).toContain('- 아침 달리기 → [감정] 개운함 → [걱정] 무릎이 상할까');
    expect(text).toContain('### 걱정 카드: 무릎이 상할까 — 그럼에도에 닿았어요');
    expect(text).toContain('- 이 걱정이 생겨난 곳: 아침 달리기 카드의 "개운함"');
    expect(text).toContain('- 무릎이 상할까 → [사실] 아직 아프진 않다 → [지키려는 것] 오래 달리고 싶다 → 그럼에도');
    expect(text).toContain('- 그럼에도 나는: 천천히라도 매일 달린다');
    expect(text).toContain('- 그럼에도 나는: (아직 적지 않음)');
    expect(buildReflectionPrompt(schema)).toContain(text);
  });
});
