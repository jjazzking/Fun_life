import { isComplete, reachesMoney } from './graph';
import { ACTION_NODE_ID, FUN_NODE_ID, type ActionCard, type CardKind } from './types';

/** 띄어쓰기·대소문자만 다른 라벨은 같은 것으로 본다 */
export function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '');
}

export function newId(): string {
  return crypto.randomUUID();
}

/** 규칙 2: 새 카드는 출발 박스와 도착 박스('재미', 걱정 카드는 '그럼에도')만 가진 상태로 시작한다. */
export function createCard(title: string, kind: CardKind = 'action'): ActionCard {
  const now = new Date().toISOString();
  return {
    id: newId(),
    kind,
    title,
    nodes: [
      { id: ACTION_NODE_ID, kind: 'action', label: title, position: { x: 0, y: 200 } },
      { id: FUN_NODE_ID, kind: 'fun', label: kind === 'worry' ? '그럼에도' : '재미', position: { x: 800, y: 200 } },
    ],
    edges: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createMoneyCard(): ActionCard {
  return createCard('돈', 'money');
}

export function createWorryCard(worry: string): ActionCard {
  return createCard(worry, 'worry');
}

/** v1 데이터에는 kind가 없었다 */
export function migrateCard(card: ActionCard): ActionCard {
  return card.kind ? card : { ...card, kind: 'action' };
}

/**
 * complete       재미까지 직접 이어짐
 * via-money      돈 박스를 거치고, 돈 카드가 재미까지 이어져 있음
 * waiting-money  돈 박스까지는 이어졌지만 돈 카드가 아직 재미에 닿지 않음
 * pending        아직 연결 중
 */
export type CardStatus = 'complete' | 'via-money' | 'waiting-money' | 'pending';

export function cardStatus(card: ActionCard, moneyCard: ActionCard | null): CardStatus {
  if (isComplete(card.edges)) return 'complete';
  if (reachesMoney(card)) {
    return moneyCard && isComplete(moneyCard.edges) ? 'via-money' : 'waiting-money';
  }
  return 'pending';
}

const CARD_STATUS_LABEL: Record<CardStatus, string> = {
  complete: '재미까지 연결됐어요',
  'via-money': '돈 카드를 거쳐 재미까지 연결됐어요',
  'waiting-money': '돈 박스까지 왔어요 · 돈 카드를 재미까지 이어주세요',
  pending: '아직 재미에 닿지 않았어요',
};

export function statusLabel(status: CardStatus, kind: CardKind): string {
  if (kind === 'worry') return status === 'complete' ? '그럼에도에 닿았어요' : '아직 그럼에도에 닿지 않았어요';
  return CARD_STATUS_LABEL[status];
}
