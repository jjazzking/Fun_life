/**
 * 도메인 모델
 *
 * ActionCard 하나 = 행동 하나에 대한 "의미 그래프".
 * 그래프에는 반드시 action 노드 1개와 fun 노드 1개가 있고,
 * 유저는 그 사이에 value(감정/효용) 노드를 만들어 연결한다.
 */

export type NodeKind = 'action' | 'value' | 'fun';

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
  title: string; // 행동 이름 (= action 노드 label)
  nodes: MeaningNode[];
  edges: MeaningEdge[];
  createdAt: string;
  updatedAt: string;
}

export const ACTION_NODE_ID = 'action';
export const FUN_NODE_ID = 'fun';
