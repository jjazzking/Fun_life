/**
 * 재미 도식(Fun Schema): 한 사람이 그린 모든 카드를 하나의 데이터로 묶는다.
 *
 * 그래프를 그대로 내보내면 사람도 AI도 읽기 어렵기 때문에,
 * 각 카드를 "출발점 → … → 재미(또는 돈)" 경로 목록으로 펼쳐서 내보낸다.
 */
import { cardStatus, type CardStatus } from './card';
import { ACTION_NODE_ID, type ActionCard, type CardKind, type MeaningNode, type ValueCategory } from './types';

export type SchemaBoxKind = ValueCategory | 'money';

export interface SchemaStep {
  label: string;
  kind: 'action' | SchemaBoxKind | 'fun';
}

export interface SchemaCard {
  title: string;
  kind: CardKind;
  status: CardStatus;
  /** 출발점에서 도착점(재미 또는 돈 박스)까지 이어진 경로들 */
  paths: SchemaStep[][];
  /** 만들었지만 아직 경로 위에 올라가지 못한 박스들 */
  unconnected: { label: string; kind: SchemaBoxKind }[];
}

export interface RecurringBox {
  label: string;
  cards: string[];
}

export interface FunSchema {
  version: 1;
  exportedAt: string;
  summary: {
    actionCards: number;
    connectedCards: number; // 직접이든 돈 카드를 거쳐서든 재미에 닿은 행동 카드
    viaMoneyCards: number;
    emotionBoxes: number;
    utilityBoxes: number;
    moneyBoxes: number;
    /** 두 개 이상의 행동 카드에 반복해서 나타난 박스 */
    recurring: RecurringBox[];
  };
  cards: SchemaCard[];
}

const MAX_PATHS_PER_CARD = 50;

function boxKind(node: MeaningNode): SchemaBoxKind {
  return node.kind === 'money' ? 'money' : (node.category ?? 'emotion');
}

function toStep(node: MeaningNode): SchemaStep {
  if (node.kind === 'action' || node.kind === 'fun') return { label: node.label, kind: node.kind };
  return { label: node.label, kind: boxKind(node) };
}

/** 출발점에서 fun/money 노드까지의 모든 단순 경로 (그래프는 사이클이 없다) */
function enumeratePaths(card: ActionCard): MeaningNode[][] {
  const byId = new Map(card.nodes.map((n) => [n.id, n]));
  const next = new Map<string, string[]>();
  for (const e of card.edges) next.set(e.source, [...(next.get(e.source) ?? []), e.target]);

  const paths: MeaningNode[][] = [];
  const walk = (id: string, trail: MeaningNode[]) => {
    if (paths.length >= MAX_PATHS_PER_CARD) return;
    const node = byId.get(id);
    if (!node || trail.includes(node)) return;
    const path = [...trail, node];
    if (node.kind === 'fun' || node.kind === 'money') {
      paths.push(path);
      return;
    }
    for (const target of next.get(id) ?? []) walk(target, path);
  };
  walk(ACTION_NODE_ID, []);
  return paths;
}

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '');
}

export function buildFunSchema(cards: ActionCard[], now = new Date()): FunSchema {
  const moneyCard = cards.find((c) => c.kind === 'money') ?? null;
  const ordered = [...cards.filter((c) => c.kind === 'action'), ...(moneyCard ? [moneyCard] : [])];

  const schemaCards: SchemaCard[] = ordered.map((card) => {
    const paths = enumeratePaths(card);
    const onPath = new Set(paths.flat().map((n) => n.id));
    return {
      title: card.title,
      kind: card.kind,
      status: cardStatus(card, card.kind === 'money' ? null : moneyCard),
      paths: paths.map((p) => p.map(toStep)),
      unconnected: card.nodes
        .filter((n) => (n.kind === 'value' || n.kind === 'money') && !onPath.has(n.id))
        .map((n) => ({ label: n.label, kind: boxKind(n) })),
    };
  });

  const actionCards = ordered.filter((c) => c.kind === 'action');
  const boxes = actionCards.flatMap((c) => c.nodes.filter((n) => n.kind === 'value' || n.kind === 'money'));

  const occurrences = new Map<string, { label: string; cards: Set<string> }>();
  for (const card of actionCards) {
    for (const node of card.nodes) {
      if (node.kind !== 'value') continue;
      const key = normalizeLabel(node.label);
      const entry = occurrences.get(key) ?? { label: node.label, cards: new Set<string>() };
      entry.cards.add(card.title);
      occurrences.set(key, entry);
    }
  }

  const statuses = schemaCards.filter((c) => c.kind === 'action').map((c) => c.status);

  return {
    version: 1,
    exportedAt: now.toISOString(),
    summary: {
      actionCards: actionCards.length,
      connectedCards: statuses.filter((s) => s === 'complete' || s === 'via-money').length,
      viaMoneyCards: statuses.filter((s) => s === 'via-money').length,
      emotionBoxes: boxes.filter((n) => n.kind === 'value' && n.category !== 'utility').length,
      utilityBoxes: boxes.filter((n) => n.kind === 'value' && n.category === 'utility').length,
      moneyBoxes: boxes.filter((n) => n.kind === 'money').length,
      recurring: [...occurrences.values()]
        .filter((o) => o.cards.size >= 2)
        .map((o) => ({ label: o.label, cards: [...o.cards] }))
        .sort((a, b) => b.cards.length - a.cards.length),
    },
    cards: schemaCards,
  };
}
