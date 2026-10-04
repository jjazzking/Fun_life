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
import { newId } from '../domain/card';
import { findForbiddenTerm } from '../domain/forbidden';
import {
  CONNECTION_ERROR_MESSAGE,
  isComplete,
  nodesOnCompletePaths,
  validateConnection,
} from '../domain/graph';
import type { ActionCard, MeaningEdge, ValueCategory } from '../domain/types';
import { navigate } from '../router';
import { cardRepository } from '../storage';

const nodeTypes = { meaning: MeaningNodeView };

function toFlowNodes(card: ActionCard): MeaningFlowNode[] {
  return card.nodes.map((n) => ({
    id: n.id,
    type: 'meaning',
    position: n.position,
    deletable: n.kind === 'value', // 행동/재미 박스는 지울 수 없다
    data: { kind: n.kind, label: n.label, category: n.category, onPath: false },
  }));
}

function toFlowEdges(card: ActionCard): Edge[] {
  return card.edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
}

function toDomainEdges(edges: Edge[]): MeaningEdge[] {
  return edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
}

function forbiddenMessage(term: string) {
  return `'${term}'은(는) 쓸 수 없어요. 돈이나 경제적 성공이 아닌, 그 행동이 직접 주는 감정과 효용을 적어주세요.`;
}

export function CardEditorPage({ cardId }: { cardId: string }) {
  const [card, setCard] = useState<ActionCard | null | undefined>(undefined);
  const [nodes, setNodes, onNodesChange] = useNodesState<MeaningFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<ValueCategory>('emotion');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    cardRepository.get(cardId).then((loaded) => {
      setCard(loaded);
      if (loaded) {
        setNodes(toFlowNodes(loaded));
        setEdges(toFlowEdges(loaded));
      }
    });
  }, [cardId, setNodes, setEdges]);

  const domainEdges = useMemo(() => toDomainEdges(edges), [edges]);
  const complete = isComplete(domainEdges);
  const onPath = useMemo(() => nodesOnCompletePaths(domainEdges), [domainEdges]);

  // 완성 경로 하이라이트
  const displayNodes = useMemo(
    () => nodes.map((n) => ({ ...n, data: { ...n.data, onPath: onPath.has(n.id) } })),
    [nodes, onPath],
  );
  const displayEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        animated: onPath.has(e.source) && onPath.has(e.target),
      })),
    [edges, onPath],
  );

  // 변경 시 자동 저장
  useEffect(() => {
    if (!card) return;
    const handle = setTimeout(() => {
      cardRepository.save({
        ...card,
        nodes: nodes.map((n) => ({
          id: n.id,
          kind: n.data.kind,
          label: n.data.label,
          category: n.data.category,
          position: n.position,
        })),
        edges: toDomainEdges(edges),
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [card, nodes, edges]);

  function handleConnect(connection: Connection) {
    const error = validateConnection(domainEdges, connection.source, connection.target);
    if (error) {
      setMessage(CONNECTION_ERROR_MESSAGE[error]);
      return;
    }
    setMessage(null);
    setEdges((eds) => addEdge({ ...connection, id: newId() }, eds));
  }

  function handleAddValue(e: FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    const forbidden = findForbiddenTerm(trimmed);
    if (forbidden) {
      setMessage(forbiddenMessage(forbidden));
      return;
    }
    const valueCount = nodes.filter((n) => n.data.kind === 'value').length;
    setNodes((ns) => [
      ...ns,
      {
        id: newId(),
        type: 'meaning',
        position: { x: 260 + (valueCount % 3) * 140, y: 40 + (valueCount % 5) * 90 },
        data: { kind: 'value', label: trimmed, category, onPath: false },
      },
    ]);
    setLabel('');
    setMessage(null);
  }

  const handleNodeDoubleClick: NodeMouseHandler<MeaningFlowNode> = (_, node) => {
    if (node.data.kind !== 'value') return;
    const next = prompt('박스 내용을 수정하세요', node.data.label)?.trim();
    if (!next) return;
    const forbidden = findForbiddenTerm(next);
    if (forbidden) {
      setMessage(forbiddenMessage(forbidden));
      return;
    }
    setNodes((ns) => ns.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, label: next } } : n)));
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
    <main className="editor-page">
      <header className="editor-header">
        <button className="back" onClick={() => navigate('/')}>
          ← 목록
        </button>
        <h2>{card.title}</h2>
        <span className={complete ? 'status done' : 'status'}>
          {complete ? '재미까지 연결됐어요' : '아직 재미에 닿지 않았어요'}
        </span>
      </header>

      <form className="add-value" onSubmit={handleAddValue}>
        <select value={category} onChange={(e) => setCategory(e.target.value as ValueCategory)}>
          <option value="emotion">감정</option>
          <option value="utility">효용</option>
        </select>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="이 행동이 주는 것 (예: 숨이 차오르는 개운함, 몸이 가벼워짐)"
          maxLength={40}
        />
        <button type="submit">박스 추가</button>
      </form>
      {message && <p className="error">{message}</p>}

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
