import { createMoneyCard } from '../domain/card';
import type { ActionCard } from '../domain/types';
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
