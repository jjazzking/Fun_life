import { createMoneyCard, createWorryCard, normalizeLabel } from '../domain/card';
import { ACTION_NODE_ID, type ActionCard } from '../domain/types';
import { LocalCardRepository } from './localRepository';
import type { CardRepository } from './repository';

// TODO(login): Supabase 세션이 있으면 SupabaseCardRepository를 반환하도록 교체
export const cardRepository: CardRepository = new LocalCardRepository();

export async function findMoneyCard(): Promise<ActionCard | null> {
  return (await cardRepository.list()).find((c) => c.kind === 'money') ?? null;
}

/** 돈 카드는 유저당 하나. 없으면 만든다. */
export async function ensureMoneyCard(): Promise<ActionCard> {
  const existing = await findMoneyCard();
  if (existing) return existing;
  const card = createMoneyCard();
  await cardRepository.save(card);
  return card;
}

/**
 * 걱정 박스에 연결할 걱정 카드. 같은 걱정(띄어쓰기·대소문자 무시)이
 * 이미 카드로 있으면 그 카드를 쓰고, 없으면 새로 만든다.
 */
export async function ensureWorryCard(worry: string): Promise<ActionCard> {
  const key = normalizeLabel(worry);
  const existing = (await cardRepository.list()).find((c) => c.kind === 'worry' && normalizeLabel(c.title) === key);
  if (existing) return existing;
  const card = createWorryCard(worry);
  await cardRepository.save(card);
  return card;
}

/** 걱정 박스 이름을 바꾸면 연결된 걱정 카드의 제목(과 출발 박스)도 따라 바뀐다 */
export async function renameCard(id: string, title: string): Promise<void> {
  const card = await cardRepository.get(id);
  if (!card) return;
  await cardRepository.save({
    ...card,
    title,
    nodes: card.nodes.map((n) => (n.id === ACTION_NODE_ID ? { ...n, label: title } : n)),
  });
}
