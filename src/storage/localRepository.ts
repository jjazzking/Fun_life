import type { ActionCard } from '../domain/types';
import type { CardRepository } from './repository';

const STORAGE_KEY = 'fun-life:cards:v1';

function readAll(): ActionCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActionCard[]) : [];
  } catch {
    return [];
  }
}

function writeAll(cards: ActionCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export class LocalCardRepository implements CardRepository {
  async list() {
    return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    return readAll().find((c) => c.id === id) ?? null;
  }

  async save(card: ActionCard) {
    const cards = readAll().filter((c) => c.id !== card.id);
    writeAll([...cards, { ...card, updatedAt: new Date().toISOString() }]);
  }

  async remove(id: string) {
    writeAll(readAll().filter((c) => c.id !== id));
  }
}
