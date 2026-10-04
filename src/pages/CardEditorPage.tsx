import {
  addEdge,
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MeaningNodeView, type MeaningFlowNode, type MeaningNodeData } from '../components/MeaningNodeView';
import { cardStatus, newId, statusLabel } from '../domain/card';
import { connectionErrorMessage, isComplete, nodesOnCompletePaths, validateConnection } from '../domain/graph';
import { findMoneyTerm } from '../domain/money';
import {
  CATEGORIES_BY_CARD,
  CATEGORY_LABEL,
  type ActionCard,
  type CardKind,
  type MeaningEdge,
  type MeaningNode,
  type ValueCategory,
} from '../domain/types';
import { navigate } from '../router';
import { cardRepository, ensureMoneyCard, ensureWorryCard, findMoneyCard, renameCard } from '../storage';

const nodeTypes = { meaning: MeaningNodeView };

type Message = { text: string; tone: 'error' | 'info' };

/** 박스 추가 폼에서 고르는 종류. 행동/돈 카드에서는 걱정 박스도 만들 수 있다. */
type BoxChoice = ValueCategory | 'worry';

function choicesFor(kind: CardKind): BoxChoice[] {
  return kind === 'worry' ? CATEGORIES_BY_CARD.worry : [...CATEGORIES_BY_CARD[kind], 'worry'];
}

const PLACEHOLDER: Record<CardKind, string> = {
  action: '이 행동이 주는 것, 혹은 걱정 (예: 숨이 차오르는 개운함, 무릎이 상할까)',
  money: '돈이 주는 것, 혹은 걱정 (예: 하고 싶은 걸 고를 수 있는 자유)',
  worry: '이 걱정을 나눠보세요 (예: 아직 일어나지 않았다, 내 몸, 오늘 할 수 있는 일)',
};

function toFlowNodes(card: ActionCard, moneyCardId?: string): MeaningFlowNode[] {
  return card.nodes.map((n) => ({
    id: n.id,
    type: 'meaning',
    position: n.position,
    deletable: n.kind === 'value' || n.kind === 'money' || n.kind === 'worry', // 출발/도착 박스는 지울 수 없다
    data: {
      kind: n.kind,
      label: n.label,
      category: n.category,
      note: n.note,
      onPath: false,
      linkedCardId: n.kind === 'money' ? moneyCardId : n.linkedCardId,
    },
  }));
}

function toDomainNodes(nodes: MeaningFlowNode[]): MeaningNode[] {
  return nodes.map((n) => ({
    id: n.id,
    kind: n.data.kind,
    label: n.data.label,
    category: n.data.category,
    // 돈 카드 링크는 매번 돈 카드에서 찾으므로 걱정 박스의 링크만 저장한다
    linkedCardId: n.data.kind === 'worry' ? n.data.linkedCardId : undefined,
    note: n.data.note,
    position: n.position,
  }));
}

function toDomainEdges(edges: Edge[]): MeaningEdge[] {
  return edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
}

export function CardEditorPage({ cardId }: { cardId: string }) {
  const [card, setCard] = useState<ActionCard | null | undefined>(undefined);
  const [moneyCard, setMoneyCard] = useState<ActionCard | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<MeaningFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [label, setLabel] = useState('');
  const [choice, setChoice] = useState<BoxChoice>('emotion');
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    Promise.all([cardRepository.get(cardId), findMoneyCard()]).then(([loaded, money]) => {
      setCard(loaded);
      setMoneyCard(money);
      if (loaded) {
        setNodes(toFlowNodes(loaded, money?.id));
        setEdges(loaded.edges.map((e) => ({ ...e })));
        setChoice(choicesFor(loaded.kind)[0]);
      }
    });
  }, [cardId, setNodes, setEdges]);

  const domainNodes = useMemo(() => toDomainNodes(nodes), [nodes]);
  const domainEdges = useMemo(() => toDomainEdges(edges), [edges]);
  const moneyComplete = !!moneyCard && isComplete(moneyCard.edges);
  const status = card ? cardStatus({ ...card, nodes: domainNodes, edges: domainEdges }, moneyCard) : 'pending';
  const onPath = useMemo(
    () => nodesOnCompletePaths(domainNodes, domainEdges, moneyComplete),
    [domainNodes, domainEdges, moneyComplete],
  );

  // 완성 경로 하이라이트
  const displayNodes = useMemo(
    () => nodes.map((n) => ({ ...n, data: { ...n.data, onPath: onPath.has(n.id) } })),
    [nodes, onPath],
  );
  const displayEdges = useMemo(
    () => edges.map((e) => ({ ...e, animated: onPath.has(e.source) && onPath.has(e.target) })),
    [edges, onPath],
  );

  // 변경 시 자동 저장
  useEffect(() => {
    if (!card) return;
    const handle = setTimeout(() => {
      cardRepository.save({ ...card, nodes: domainNodes, edges: domainEdges });
    }, 300);
    return () => clearTimeout(handle);
  }, [card, domainNodes, domainEdges]);

  function handleConnect(connection: Connection) {
    const error = validateConnection(domainNodes, domainEdges, connection.source, connection.target);
    if (error) {
      setMessage({ text: connectionErrorMessage(error, card!.kind), tone: 'error' });
      return;
    }
    setMessage(null);
    setEdges((eds) => addEdge({ ...connection, id: newId() }, eds));
  }

  /** 행동 카드에서 돈 관련 박스는 돈 박스가 되고, 돈 카드가 없으면 만든다. */
  async function moneyCardFor(text: string): Promise<ActionCard | null> {
    if (card?.kind !== 'action' || !findMoneyTerm(text)) return null;
    const money = await ensureMoneyCard();
    setMoneyCard(money);
    return money;
  }

  const moneyNotice = (money: ActionCard): Message => ({
    text: `돈 박스가 됐어요. 돈이 어떻게 재미로 이어지는지는 '${money.title}' 카드에서 따로 그려주세요.`,
    tone: 'info',
  });

  const worryNotice = (worry: ActionCard): Message => ({
    text: `걱정 박스가 됐어요. 이 걱정이 지키려는 것과, 그럼에도 무엇을 할지는 '${worry.title}' 걱정 카드에서 정리해보세요.`,
    tone: 'info',
  });

  async function buildBox(text: string): Promise<{ data: MeaningNodeData; notice: Message | null }> {
    if (choice === 'worry') {
      const worry = await ensureWorryCard(text);
      return { data: { kind: 'worry', label: text, onPath: false, linkedCardId: worry.id }, notice: worryNotice(worry) };
    }
    const money = await moneyCardFor(text);
    if (money) {
      return { data: { kind: 'money', label: text, onPath: false, linkedCardId: money.id }, notice: moneyNotice(money) };
    }
    return { data: { kind: 'value', label: text, category: choice, onPath: false }, notice: null };
  }

  async function handleAddValue(e: FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    const { data, notice } = await buildBox(trimmed);
    const index = nodes.filter((n) => n.data.kind !== 'action' && n.data.kind !== 'fun').length;
    setNodes((ns) => [
      ...ns,
      {
        id: newId(),
        type: 'meaning',
        position: { x: 260 + (index % 3) * 140, y: 40 + (index % 5) * 90 },
        data,
      },
    ]);
    setLabel('');
    setMessage(notice);
  }

  async function editWorryBox(node: MeaningFlowNode) {
    const next = prompt('걱정을 수정하세요', node.data.label)?.trim();
    if (!next) return;
    if (node.data.linkedCardId) await renameCard(node.data.linkedCardId, next);
    setNodes((ns) => ns.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, label: next } } : n)));
  }

  /** 걱정 카드의 도착 박스: "그럼에도 나는 ___" */
  function editResolve(node: MeaningFlowNode) {
    const next = prompt('그럼에도 나는…', node.data.note ?? '');
    if (next === null || next === undefined) return;
    const note = next.trim() || undefined;
    setNodes((ns) => ns.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, note } } : n)));
  }

  async function editValueBox(node: MeaningFlowNode) {
    const next = prompt('박스 내용을 수정하세요', node.data.label)?.trim();
    if (!next) return;
    const money = await moneyCardFor(next);
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id !== node.id) return n;
        if (money) return { ...n, data: { kind: 'money', label: next, onPath: false, linkedCardId: money.id } };
        const category = n.data.category ?? CATEGORIES_BY_CARD[card!.kind][0];
        return { ...n, data: { kind: 'value', label: next, category, onPath: false } };
      }),
    );
    // 돈 박스는 도착점이므로 나가던 선은 끊는다
    if (money) setEdges((eds) => eds.filter((e) => e.source !== node.id));
    setMessage(money && node.data.kind !== 'money' ? moneyNotice(money) : null);
  }

  const handleNodeDoubleClick: NodeMouseHandler<MeaningFlowNode> = (_, node) => {
    if (node.data.kind === 'worry') editWorryBox(node);
    else if (node.data.kind === 'fun' && card?.kind === 'worry') editResolve(node);
    else if (node.data.kind === 'value' || node.data.kind === 'money') editValueBox(node);
  };

  if (card === undefined) return <main className="editor-page loading">불러오는 중…</main>;
  if (card === null) {
    return (
      <main className="editor-page loading">
        <p>카드를 찾을 수 없어요.</p>
        <button onClick={() => navigate('/')}>목록으로</button>
      </main>
    );
  }

  return (
    <main className={`editor-page ${card.kind}`}>
      <header className="editor-header">
        <button className="back" onClick={() => navigate('/')}>
          ← 목록
        </button>
        {card.kind === 'worry' && <span className="card-kind">걱정 카드</span>}
        <h2>{card.title}</h2>
        <span className={`status ${status}`}>{statusLabel(status, card.kind)}</span>
      </header>

      <form className="add-value" onSubmit={handleAddValue}>
        <select value={choice} onChange={(e) => setChoice(e.target.value as BoxChoice)}>
          {choicesFor(card.kind).map((c) => (
            <option key={c} value={c}>
              {c === 'worry' ? '걱정' : CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={PLACEHOLDER[card.kind]} maxLength={40} />
        <button type="submit">박스 추가</button>
      </form>
      {message && <p className={message.tone}>{message.text}</p>}

      <div className="canvas">
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <p className="hint">
        박스 오른쪽 점을 끌어 다음 박스에 연결 · 더블클릭으로 수정
        {card.kind === 'worry' ? " ('그럼에도'를 더블클릭해 결단을 적어요)" : ''} · 선택 후 Delete로 삭제
      </p>
    </main>
  );
}
