/**
 * 재미 도식(Fun Schema): 한 사람이 그린 모든 카드를 하나의 데이터로 묶는다.
 *
 * 그래프를 그대로 내보내면 사람도 AI도 읽기 어렵기 때문에,
 * 각 카드를 "출발점 → … → 도착점" 경로 목록으로 펼쳐서 내보낸다.
 * 도착점은 재미, 돈 박스, 걱정 박스, 그리고 걱정 카드의 '그럼에도'.
 */
import { cardStatus, normalizeLabel, type CardStatus } from './card';
import {
  ACTION_NODE_ID,
  FUN_NODE_ID,
  type ActionCard,
  type CardKind,
  type MeaningNode,
  type ValueCategory,
} from './types';

export type SchemaBoxKind = ValueCategory | 'money' | 'worry';

export interface SchemaStep {
  label: string;
  kind: 'action' | SchemaBoxKind | 'fun';
}

export interface SchemaCard {
  title: string;
  kind: CardKind;
  status: CardStatus;
  /** 출발점에서 도착점까지 이어진 경로들 */
  paths: SchemaStep[][];
  /** 만들었지만 아직 경로 위에 올라가지 못한 박스들 */
  unconnected: { label: string; kind: SchemaBoxKind }[];
  /** 걱정 카드: 이 걱정이 어느 카드의 어느 박스에서 생겨났는지 */
  origins?: { card: string; from: string }[];
  /** 걱정 카드: "그럼에도 나는 ___" */
  resolve?: string;
}

export interface RecurringBox {
  label: string;
  cards: string[];
}

export interface FunSchema {
  version: 2;
  exportedAt: string;
  summary: {
    actionCards: number;
    connectedCards: number; // 직접이든 돈 카드를 거쳐서든 재미에 닿은 행동 카드
    viaMoneyCards: number;
    emotionBoxes: number;
    utilityBoxes: number;
    moneyBoxes: number;
    worryBoxes: number;
    /** 돈 박스를 도착점(보상)으로 둔 행동 카드 제목들 */
    moneyRewardActions: string[];
    worryCards: number;
    resolvedWorryCards: number; // '그럼에도'까지 이어진 걱정 카드
    /** 두 개 이상의 행동 카드에 반복해서 나타난 박스 */
    recurring: RecurringBox[];
  };
  cards: SchemaCard[];
}

const MAX_PATHS_PER_CARD = 50;
const END_KINDS = new Set<MeaningNode['kind']>(['fun', 'money', 'worry']);
const BOX_KINDS = new Set<MeaningNode['kind']>(['value', 'money', 'worry']);

function boxKind(node: MeaningNode): SchemaBoxKind {
  if (node.kind === 'money' || node.kind === 'worry') return node.kind;
  return node.category ?? 'emotion';
}

function toStep(node: MeaningNode): SchemaStep {
  if (node.kind === 'action' || node.kind === 'fun') return { label: node.label, kind: node.kind };
  return { label: node.label, kind: boxKind(node) };
}

/** 출발점에서 도착 노드까지의 모든 단순 경로 (그래프는 사이클이 없다) */
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
    if (END_KINDS.has(node.kind)) {
      paths.push(path);
      return;
    }
    for (const target of next.get(id) ?? []) walk(target, path);
  };
  walk(ACTION_NODE_ID, []);
  return paths;
}

/** 걱정 카드 id → 그 걱정 박스가 달린 (카드, 바로 앞 박스) 목록 */
function worryOrigins(cards: ActionCard[]): Map<string, { card: string; from: string }[]> {
  const origins = new Map<string, { card: string; from: string }[]>();
  for (const card of cards) {
    if (card.kind === 'worry') continue;
    const byId = new Map(card.nodes.map((n) => [n.id, n]));
    for (const node of card.nodes) {
      if (node.kind !== 'worry' || !node.linkedCardId) continue;
      const sources = card.edges.filter((e) => e.target === node.id).map((e) => byId.get(e.source)?.label);
      const list = origins.get(node.linkedCardId) ?? [];
      for (const from of sources.length ? sources : [undefined]) {
        list.push({ card: card.title, from: from ?? '(아직 연결 안 됨)' });
      }
      origins.set(node.linkedCardId, list);
    }
  }
  return origins;
}

export function buildFunSchema(cards: ActionCard[], now = new Date()): FunSchema {
  const moneyCard = cards.find((c) => c.kind === 'money') ?? null;
  const actionCards = cards.filter((c) => c.kind === 'action');
  const worryCards = cards.filter((c) => c.kind === 'worry');
  const ordered = [...actionCards, ...(moneyCard ? [moneyCard] : []), ...worryCards];
  const origins = worryOrigins(cards);

  const schemaCards: SchemaCard[] = ordered.map((card) => {
    const paths = enumeratePaths(card);
    const onPath = new Set(paths.flat().map((n) => n.id));
    const schemaCard: SchemaCard = {
      title: card.title,
      kind: card.kind,
      status: cardStatus(card, card.kind === 'action' ? moneyCard : null),
      paths: paths.map((p) => p.map(toStep)),
      unconnected: card.nodes
        .filter((n) => BOX_KINDS.has(n.kind) && !onPath.has(n.id))
        .map((n) => ({ label: n.label, kind: boxKind(n) })),
    };
    if (card.kind === 'worry') {
      schemaCard.origins = origins.get(card.id) ?? [];
      const resolve = card.nodes.find((n) => n.id === FUN_NODE_ID)?.note;
      if (resolve) schemaCard.resolve = resolve;
    }
    return schemaCard;
  });

  const boxes = actionCards.flatMap((c) => c.nodes.filter((n) => BOX_KINDS.has(n.kind)));

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

  const actionStatuses = schemaCards.filter((c) => c.kind === 'action').map((c) => c.status);

  return {
    version: 2,
    exportedAt: now.toISOString(),
    summary: {
      actionCards: actionCards.length,
      connectedCards: actionStatuses.filter((s) => s === 'complete' || s === 'via-money').length,
      viaMoneyCards: actionStatuses.filter((s) => s === 'via-money').length,
      emotionBoxes: boxes.filter((n) => n.kind === 'value' && n.category !== 'utility').length,
      utilityBoxes: boxes.filter((n) => n.kind === 'value' && n.category === 'utility').length,
      moneyBoxes: boxes.filter((n) => n.kind === 'money').length,
      worryBoxes: boxes.filter((n) => n.kind === 'worry').length,
      moneyRewardActions: schemaCards
        .filter((c) => c.kind === 'action' && c.paths.some((p) => p.at(-1)?.kind === 'money'))
        .map((c) => c.title),
      worryCards: worryCards.length,
      resolvedWorryCards: schemaCards.filter((c) => c.kind === 'worry' && c.status === 'complete').length,
      recurring: [...occurrences.values()]
        .filter((o) => o.cards.size >= 2)
        .map((o) => ({ label: o.label, cards: [...o.cards] }))
        .sort((a, b) => b.cards.length - a.cards.length),
    },
    cards: schemaCards,
  };
}
