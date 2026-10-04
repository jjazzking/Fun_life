import { useEffect, useState, type FormEvent } from 'react';
import { navigate } from '../router';
import { createCard } from '../domain/card';
import { findForbiddenTerm } from '../domain/forbidden';
import { isComplete } from '../domain/graph';
import type { ActionCard } from '../domain/types';
import { cardRepository } from '../storage';

export function CardListPage() {
  const [cards, setCards] = useState<ActionCard[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cardRepository.list().then(setCards);
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const forbidden = findForbiddenTerm(trimmed);
    if (forbidden) {
      setError(`'${forbidden}'은(는) 쓸 수 없어요. 행동 그 자체를 적어주세요.`);
      return;
    }
    const card = createCard(trimmed);
    await cardRepository.save(card);
    navigate(`/card/${card.id}`);
  }

  async function handleRemove(id: string) {
    if (!confirm('이 카드를 삭제할까요?')) return;
    await cardRepository.remove(id);
    setCards(await cardRepository.list());
  }

  return (
    <main className="list-page">
      <header>
        <h1>Fun Life</h1>
        <p className="subtitle">어떤 행동이든, 그 행동 자체가 주는 것을 따라가면 재미에 닿는다.</p>
      </header>

      <form className="new-card" onSubmit={handleCreate}>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          placeholder="행동을 적어보세요 (예: 아침 달리기, 영어 단어 외우기)"
          maxLength={40}
        />
        <button type="submit">카드 만들기</button>
      </form>
      {error && <p className="error">{error}</p>}

      <ul className="card-grid">
        {cards.map((card) => (
          <li key={card.id} className={isComplete(card.edges) ? 'card done' : 'card'}>
            <button className="card-open" onClick={() => navigate(`/card/${card.id}`)}>
              <strong>{card.title}</strong>
              <span>
                {isComplete(card.edges) ? '재미까지 연결됨' : '연결 중'} · 박스 {card.nodes.length - 2}개
              </span>
            </button>
            <button className="card-remove" onClick={() => handleRemove(card.id)} aria-label="삭제">
              ×
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
