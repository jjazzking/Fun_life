import { LocalCardRepository } from './localRepository';
import type { CardRepository } from './repository';

// TODO(login): Supabase 세션이 있으면 SupabaseCardRepository를 반환하도록 교체
export const cardRepository: CardRepository = new LocalCardRepository();
