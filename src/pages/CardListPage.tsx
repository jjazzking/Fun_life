import { useEffect, useState, type FormEvent } from 'react';
import { cardStatus, CARD_STATUS_LABEL, createCard, type CardStatus } from '../domain/card';
import type { ActionCard } from '../domain/types';
import { navigate } from '../router';
import { cardRepository } from '../storage';

const DONE: CardStatus[] = ['complete', 'via-money'];

export function CardListPage() {
  const [cards, setCards] = useState<ActionCard[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    cardRepository.list().then(setCards);
  }, []);

  const moneyCard = cards.find((c) => c.kind === 'money') ?? null;
  const actionCards = cards.filter((c) => c.kind === 'action');

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const card = createCard(trimmed);
    await cardRepository.save(card);
    navigate(`/card/${card.id}`);
  }

  async function handleRemove(id: string) {
    if (!confirm('이 카드를 삭제할까요?')) return;
    await cardRepository.remove(id);
    setCards(await cardRepository.list());
  }

  function renderCard(card: ActionCard, removable: boolean) {
    const status = card.kind === 'money' ? cardStatus(card, null) : cardStatus(card, moneyCard);
    return (
      <li key={card.id} className={`card ${card.kind} ${DONE.includes(status) ? 'done' : ''}`}>
        <button className="card-open" onClick={() => navigate(`/card/${card.id}`)}>
          {card.kind === 'money' && <span className="card-kind">특별 카드</span>}
          <strong>{card.title}</strong>
          <span>
            {CARD_STATUS_LABEL[status]} · 박스 {card.nodes.length - 2}개
          </span>
        </button>
        {removable && (
          <button className="card-remove" onClick={() => handleRemove(card.id)} aria-label="삭제">
            ×
          </button>
        )}
      </li>
    );
  }

  return (
    <main className="list-page">
      <header>
        <h1>Fun Life</h1>
        <p className="subtitle">어떤 행동이든, 그 행동 자체가 주는 것을 따라가면 재미에 닿는다.</p>
        {actionCards.length > 0 && (
          <button className="schema-link" onClick={() => navigate('/schema')}>
            내 재미 도식 보기 · AI와 돌아보기 →
          </button>
        )}
      </header>

      <form className="new-card" onSubmit={handleCreate}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="행동을 적어보세요 (예: 아침 달리기, 영어 단어 외우기)"
          maxLength={40}
        />
        <button type="submit">카드 만들기</button>
      </form>

      <ul className="card-grid">
        {/* 돈 카드는 행동 카드와 같은 계층에 두되, 하나뿐이고 지울 수 없다 */}
        {moneyCard && renderCard(moneyCard, false)}
        {actionCards.map((card) => renderCard(card, true))}
      </ul>
    </main>
  );
}
