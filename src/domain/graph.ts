/**
 * 연결 규칙과 완성 판정.
 *
 * - action 노드로 들어오는 선 금지 (방향: 행동 → … → 재미)
 * - fun / money / worry 노드에서 나가는 선 금지 (모두 도착점. 그 너머는 돈 카드·걱정 카드가 담당)
 * - action → fun 직결 금지: 반드시 중간 박스를 하나 이상 거쳐야 한다
 * - 자기 자신 연결, 중복 연결, 사이클 금지
 * - 카드 완성 = action에서 출발해 fun에 도달하는 경로가 존재
 */
import { ACTION_NODE_ID, FUN_NODE_ID, type ActionCard, type CardKind, type MeaningEdge, type MeaningNode } from './types';

export type ConnectionError =
  | 'self'
  | 'into-action'
  | 'out-of-fun'
  | 'out-of-money'
  | 'out-of-worry'
  | 'direct-to-fun'
  | 'duplicate'
  | 'cycle';

export const CONNECTION_ERROR_MESSAGE: Record<ConnectionError, string> = {
  self: '자기 자신에게는 연결할 수 없어요.',
  'into-action': '출발 박스로 들어오는 선은 만들 수 없어요.',
  'out-of-fun': '재미 박스는 도착점이에요. 나가는 선은 만들 수 없어요.',
  'out-of-money': '돈 박스 너머는 돈 카드에서 따로 이어주세요.',
  'out-of-worry': '걱정 박스 너머는 걱정 카드에서 따로 정리해주세요.',
  'direct-to-fun': '출발점에서 재미로 바로 갈 수는 없어요. 그 사이의 감정이나 효용을 먼저 찾아보세요.',
  duplicate: '이미 연결되어 있어요.',
  cycle: '순환 연결은 만들 수 없어요.',
};

function reachable(edges: MeaningEdge[], from: string, to: string): boolean {
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    adjacency.set(e.source, [...(adjacency.get(e.source) ?? []), e.target]);
  }
  const visited = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === to) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    stack.push(...(adjacency.get(current) ?? []));
  }
  return false;
}

export function validateConnection(
  nodes: Pick<MeaningNode, 'id' | 'kind'>[],
  edges: MeaningEdge[],
  source: string,
  target: string,
): ConnectionError | null {
  if (source === target) return 'self';
  if (target === ACTION_NODE_ID) return 'into-action';
  if (source === FUN_NODE_ID) return 'out-of-fun';
  const sourceKind = nodes.find((n) => n.id === source)?.kind;
  if (sourceKind === 'money') return 'out-of-money';
  if (sourceKind === 'worry') return 'out-of-worry';
  if (source === ACTION_NODE_ID && target === FUN_NODE_ID) return 'direct-to-fun';
  if (edges.some((e) => e.source === source && e.target === target)) return 'duplicate';
  if (reachable(edges, target, source)) return 'cycle';
  return null;
}

/** 걱정 카드에서는 도착점이 '그럼에도'이므로 안내 문구만 바꾼다 */
export function connectionErrorMessage(error: ConnectionError, cardKind: CardKind): string {
  if (cardKind === 'worry') {
    if (error === 'direct-to-fun') {
      return '걱정에서 그럼에도로 바로 갈 수는 없어요. 사실, 지키려는 것, 내 몫과 내 몫 아님을 먼저 나눠보세요.';
    }
    if (error === 'out-of-fun') return "'그럼에도'는 도착점이에요. 나가는 선은 만들 수 없어요.";
  }
  return CONNECTION_ERROR_MESSAGE[error];
}

export function isComplete(edges: MeaningEdge[]): boolean {
  return reachable(edges, ACTION_NODE_ID, FUN_NODE_ID);
}

/** 출발점에서 돈 박스 중 하나에 도달하는지 */
export function reachesMoney(card: Pick<ActionCard, 'nodes' | 'edges'>): boolean {
  return card.nodes.some((n) => n.kind === 'money' && reachable(card.edges, ACTION_NODE_ID, n.id));
}

/**
 * 출발점 → 도착점(fun, 그리고 돈 카드가 완성됐다면 money 박스) 경로 위의 노드 id들.
 * 완성 경로 하이라이트용.
 */
export function nodesOnCompletePaths(
  nodes: Pick<MeaningNode, 'id' | 'kind'>[],
  edges: MeaningEdge[],
  moneyComplete: boolean,
): Set<string> {
  const goals = [FUN_NODE_ID, ...(moneyComplete ? nodes.filter((n) => n.kind === 'money').map((n) => n.id) : [])];
  const result = new Set<string>();
  for (const { id } of nodes) {
    if (reachable(edges, ACTION_NODE_ID, id) && goals.some((goal) => reachable(edges, id, goal))) {
      result.add(id);
    }
  }
  return result;
}
