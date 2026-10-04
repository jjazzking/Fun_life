/**
 * 저장소 추상화.
 *
 * UI는 이 인터페이스에만 의존한다. 지금은 LocalStorage 구현을 쓰고,
 * 로그인을 붙일 때 SupabaseCardRepository를 만들어 갈아끼우면 된다.
 */
import type { ActionCard } from '../domain/types';

export interface CardRepository {
  list(): Promise<ActionCard[]>;
  get(id: string): Promise<ActionCard | null>;
  save(card: ActionCard): Promise<void>;
  remove(id: string): Promise<void>;
}
