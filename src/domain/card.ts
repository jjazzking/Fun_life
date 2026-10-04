import { ACTION_NODE_ID, FUN_NODE_ID, type ActionCard } from './types';

export function newId(): string {
  return crypto.randomUUID();
}

/** 규칙 2: 새 카드는 행동 박스와 '재미' 박스만 가진 상태로 시작한다. */
export function createCard(title: string): ActionCard {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title,
    nodes: [
      { id: ACTION_NODE_ID, kind: 'action', label: title, position: { x: 0, y: 200 } },
      { id: FUN_NODE_ID, kind: 'fun', label: '재미', position: { x: 800, y: 200 } },
    ],
    edges: [],
    createdAt: now,
    updatedAt: now,
  };
}
