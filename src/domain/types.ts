/**
 * 도메인 모델
 *
 * ActionCard 하나 = 출발점 하나에 대한 "의미 그래프".
 * 그래프에는 반드시 출발 노드(id 'action') 1개와 도착 노드(id 'fun') 1개가 있고,
 * 유저는 그 사이에 value 노드를 만들어 연결한다.
 *
 * 카드 종류
 *   action  유저가 만든 행동 카드. 출발 = 그 행동, 도착 = 재미.
 *   money   유저당 하나뿐인 특별한 '돈 카드'. 출발 = 돈, 도착 = 재미.
 *           행동 카드에 돈 박스가 생기면 자동으로 만들어진다.
 *   worry   걱정 카드 (걱정과 부족함을 함께 다룬다). 출발 = 걱정, 도착 = '그럼에도'.
 *           행동/돈 카드에 걱정 박스가 생기면 만들어진다. 여러 개일 수 있다.
 *
 * 노드 종류
 *   money   행동 카드 안의 돈 박스. 도착점이며 그 너머는 돈 카드가 담당한다.
 *   worry   행동/돈 카드 안의 걱정 박스. 도착점이며 그 너머는 연결된 걱정 카드가 담당한다.
 */

export type CardKind = 'action' | 'money' | 'worry';

export type NodeKind = 'action' | 'value' | 'money' | 'worry' | 'fun';

/**
 * value 노드의 성격
 *   행동/돈 카드: emotion(감정) · utility(효용)
 *   걱정 카드:    fact(사실) · protects(지키려는 것) · mine(내 몫) · notMine(내 몫 아님)
 */
export type ValueCategory = 'emotion' | 'utility' | 'fact' | 'protects' | 'mine' | 'notMine';

export const CATEGORIES_BY_CARD: Record<CardKind, ValueCategory[]> = {
  action: ['emotion', 'utility'],
  money: ['emotion', 'utility'],
  worry: ['fact', 'protects', 'mine', 'notMine'],
};

export const CATEGORY_LABEL: Record<ValueCategory, string> = {
  emotion: '감정',
  utility: '효용',
  fact: '사실',
  protects: '지키려는 것',
  mine: '내 몫',
  notMine: '내 몫 아님',
};

export interface MeaningNode {
  id: string;
  kind: NodeKind;
  label: string;
  category?: ValueCategory; // kind === 'value' 일 때만
  linkedCardId?: string; // kind === 'worry' 일 때 연결된 걱정 카드
  note?: string; // 걱정 카드의 도착 노드: "그럼에도 나는 ___"
  position: { x: number; y: number };
}

export interface MeaningEdge {
  id: string;
  source: string;
  target: string;
}

export interface ActionCard {
  id: string;
  kind: CardKind;
  title: string; // 출발점 이름 (= action 노드 label)
  nodes: MeaningNode[];
  edges: MeaningEdge[];
  createdAt: string;
  updatedAt: string;
}

export const ACTION_NODE_ID = 'action';
export const FUN_NODE_ID = 'fun';
