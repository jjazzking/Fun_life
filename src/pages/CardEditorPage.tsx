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
import { MeaningNodeView, type MeaningFlowNode } from '../components/MeaningNodeView';
import { cardStatus, CARD_STATUS_LABEL, newId } from '../domain/card';
import { CONNECTION_ERROR_MESSAGE, isComplete, nodesOnCompletePaths, validateConnection } from '../domain/graph';
import { findMoneyTerm } from '../domain/money';
import type { ActionCard, MeaningEdge, MeaningNode, ValueCategory } from '../domain/types';
import { navigate } from '../router';
import { cardRepository, ensureMoneyCard, findMoneyCard } from '../storage';

const nodeTypes = { meaning: MeaningNodeView };

type Message = { text: string; tone: 'error' | 'info' };

function toFlowNodes(card: ActionCard, moneyCardId?: string): MeaningFlowNode[] {
  return card.nodes.map((n) => ({
    id: n.id,
    type: 'meaning',
    position: n.position,
    deletable: n.kind === 'value' || n.kind === 'money', // 출발/재미 박스는 지울 수 없다
    data: { kind: n.kind, label: n.label, category: n.category, onPath: false, moneyCardId },
  }));
}

function toDomainNodes(nodes: MeaningFlowNode[]): MeaningNode[] {
  return nodes.map((n) => ({
    id: n.id,
    kind: n.data.kind,
    label: n.data.label,
    category: n.data.category,
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
  const [category, setCategory] = useState<ValueCategory>('emotion');
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    Promise.all([cardRepository.get(cardId), findMoneyCard()]).then(([loaded, money]) => {
      setCard(loaded);
      setMoneyCard(money);
      if (loaded) {
        setNodes(toFlowNodes(loaded, money?.id));
        setEdges(loaded.edges.map((e) => ({ ...e })));
      }
    });
  }, [cardId, setNodes, setEdges]);

  const isActionCard = card?.kind === 'action';
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
      setMessage({ text: CONNECTION_ERROR_MESSAGE[error], tone: 'error' });
      return;
    }
    setMessage(null);
    setEdges((eds) => addEdge({ ...connection, id: newId() }, eds));
  }

  /** 행동 카드에서 돈 관련 박스는 돈 박스가 되고, 돈 카드가 없으면 만든다. */
  async function moneyCardFor(text: string): Promise<ActionCard | null> {
    if (!isActionCard || !findMoneyTerm(text)) return null;
    const money = await ensureMoneyCard();
    setMoneyCard(money);
    return money;
  }

  const moneyNotice = (money: ActionCard): Message => ({
    text: `돈 박스가 됐어요. 돈이 어떻게 재미로 이어지는지는 '${money.title}' 카드에서 따로 그려주세요.`,
    tone: 'info',
  });

  async function handleAddValue(e: FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    const money = await moneyCardFor(trimmed);
    const index = nodes.filter((n) => n.data.kind === 'value' || n.data.kind === 'money').length;
    setNodes((ns) => [
      ...ns,
      {
        id: newId(),
        type: 'meaning',
        position: { x: 260 + (index % 3) * 140, y: 40 + (index % 5) * 90 },
        data: money
          ? { kind: 'money', label: trimmed, onPath: false, moneyCardId: money.id }
          : { kind: 'value', label: trimmed, category, onPath: false },
      },
    ]);
    setLabel('');
    setMessage(money ? moneyNotice(money) : null);
  }

  const handleNodeDoubleClick: NodeMouseHandler<MeaningFlowNode> = async (_, node) => {
    if (node.data.kind !== 'value' && node.data.kind !== 'money') return;
    const next = prompt('박스 내용을 수정하세요', node.data.label)?.trim();
    if (!next) return;
    const money = await moneyCardFor(next);
    setNodes((ns) =>
      ns.map((n) => {
        if (n.id !== node.id) return n;
        if (money) return { ...n, data: { kind: 'money', label: next, onPath: false, moneyCardId: money.id } };
        return { ...n, data: { kind: 'value', label: next, category: n.data.category ?? 'emotion', onPath: false } };
      }),
    );
    // 돈 박스는 도착점이므로 나가던 선은 끊는다
    if (money) setEdges((eds) => eds.filter((e) => e.source !== node.id));
    setMessage(money && node.data.kind !== 'money' ? moneyNotice(money) : null);
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
        <h2>{card.title}</h2>
        <span className={`status ${status}`}>{CARD_STATUS_LABEL[status]}</span>
      </header>

      <form className="add-value" onSubmit={handleAddValue}>
        <select value={category} onChange={(e) => setCategory(e.target.value as ValueCategory)}>
          <option value="emotion">감정</option>
          <option value="utility">효용</option>
        </select>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={
            isActionCard
              ? '이 행동이 주는 것 (예: 숨이 차오르는 개운함, 몸이 가벼워짐)'
              : '돈이 주는 것 (예: 하고 싶은 걸 고를 수 있는 자유, 안심)'
          }
          maxLength={40}
        />
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
      <p className="hint">박스 오른쪽 점을 끌어 다음 박스에 연결 · 더블클릭으로 수정 · 선택 후 Delete로 삭제</p>
    </main>
  );
}
