import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { CATEGORY_LABEL, type NodeKind, type ValueCategory } from '../domain/types';

export type MeaningNodeData = {
  kind: NodeKind;
  label: string;
  category?: ValueCategory;
  onPath: boolean;
  linkedCardId?: string; // money: 돈 카드 · worry: 걱정 카드
  note?: string; // 걱정 카드의 '그럼에도' 박스에 적은 결단
};

export type MeaningFlowNode = Node<MeaningNodeData, 'meaning'>;

const LINK_TEXT: Partial<Record<NodeKind, string>> = {
  money: '돈 카드로 →',
  worry: '걱정 카드로 →',
};

/** action: 오른쪽 출구만 / fun·money·worry: 왼쪽 입구만 / value: 양쪽 */
export function MeaningNodeView({ data }: NodeProps<MeaningFlowNode>) {
  const { kind, label, category, onPath, linkedCardId, note } = data;
  const isEnd = kind === 'fun' || kind === 'money' || kind === 'worry';
  return (
    <div className={`meaning-node ${kind} ${category ?? ''} ${onPath ? 'on-path' : ''}`}>
      {kind !== 'action' && <Handle type="target" position={Position.Left} />}
      {kind === 'value' && category && <span className="tag">{CATEGORY_LABEL[category]}</span>}
      {kind === 'money' && <span className="tag">돈</span>}
      {kind === 'worry' && <span className="tag">걱정</span>}
      <div className="label">{label}</div>
      {note && <div className="note">{note}</div>}
      {linkedCardId && LINK_TEXT[kind] && (
        <a className="nodrag node-link" href={`#/card/${linkedCardId}`}>
          {LINK_TEXT[kind]}
        </a>
      )}
      {!isEnd && <Handle type="source" position={Position.Right} />}
    </div>
  );
}
