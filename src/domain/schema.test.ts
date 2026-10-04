import { describe, expect, it } from 'vitest';
import { createCard, createMoneyCard } from './card';
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

const running = card(
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

describe('buildFunSchema', () => {
  const schema = buildFunSchema([money, work, running], new Date('2026-10-04T00:00:00Z'));

  it('행동 카드를 먼저, 돈 카드를 마지막에 둔다', () => {
    expect(schema.cards.map((c) => c.title)).toEqual(['야근하기', '아침 달리기', '돈']);
  });

  it('카드를 경로로 펼친다', () => {
    const runningCard = schema.cards[1];
    expect(runningCard.paths.map((p) => p.map((s) => s.label))).toEqual([
      ['아침 달리기', '개운함', '재미'],
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
    });
    // 띄어쓰기만 다른 박스는 같은 것으로 본다
    expect(schema.summary.recurring).toEqual([{ label: '개운 함', cards: ['야근하기', '아침 달리기'] }]);
  });

  it('프롬프트에 도식이 들어간다', () => {
    const text = renderSchemaText(schema);
    expect(text).toContain('- 아침 달리기 → [효용] 몸이 가벼워짐 → 재미');
    expect(text).toContain('- 야근하기 → [감정] 개운 함 → [돈] 연봉 상승');
    expect(text).toContain('아직 어디에도 잇지 못한 박스: [감정] 외로움');
    expect(text).toContain('- 돈을 보상(도착점)으로 둔 행동: 야근하기');
    expect(buildReflectionPrompt(schema)).toContain(text);
  });
});
