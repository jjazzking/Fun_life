/**
 * 도메인 모델
 *
 * ActionCard 하나 = 출발점 하나에 대한 "의미 그래프".
 * 그래프에는 반드시 출발 노드(action) 1개와 fun 노드 1개가 있고,
 * 유저는 그 사이에 value(감정/효용) 노드를 만들어 연결한다.
 *
 * 카드 종류
 *   action  유저가 만든 행동 카드. 출발 노드 = 그 행동.
 *   money   유저당 하나뿐인 특별한 '돈 카드'. 출발 노드 = 돈.
 *           행동 카드에 돈 박스가 생기면 자동으로 만들어진다.
 *
 * 노드 종류
 *   money   행동 카드 안의 돈 박스. fun처럼 도착점이며 그 너머는 돈 카드가 담당한다.
 */

export type CardKind = 'action' | 'money';

export type NodeKind = 'action' | 'value' | 'money' | 'fun';

/** value 노드의 성격: 행동이 직접 주는 감정인지, 인간적인 효용인지 */
export type ValueCategory = 'emotion' | 'utility';

export interface MeaningNode {
  id: string;
  kind: NodeKind;
  label: string;
  category?: ValueCategory; // kind === 'value' 일 때만
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
