import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { NodeKind, ValueCategory } from '../domain/types';

export type MeaningNodeData = {
  kind: NodeKind;
  label: string;
  category?: ValueCategory;
  onPath: boolean;
  moneyCardId?: string; // kind === 'money' 일 때 이동할 돈 카드
};

export type MeaningFlowNode = Node<MeaningNodeData, 'meaning'>;

const CATEGORY_LABEL: Record<ValueCategory, string> = {
  emotion: '감정',
  utility: '효용',
};

/** action: 오른쪽 출구만 / fun·money: 왼쪽 입구만 / value: 양쪽 */
export function MeaningNodeView({ data }: NodeProps<MeaningFlowNode>) {
  const { kind, label, category, onPath, moneyCardId } = data;
  const isEnd = kind === 'fun' || kind === 'money';
  return (
    <div className={`meaning-node ${kind} ${category ?? ''} ${onPath ? 'on-path' : ''}`}>
      {kind !== 'action' && <Handle type="target" position={Position.Left} />}
      {kind === 'value' && category && <span className="tag">{CATEGORY_LABEL[category]}</span>}
      {kind === 'money' && <span className="tag">돈</span>}
      <div className="label">{label}</div>
      {kind === 'money' && moneyCardId && (
        <a className="nodrag money-link" href={`#/card/${moneyCardId}`}>
          돈 카드로 →
        </a>
      )}
      {!isEnd && <Handle type="source" position={Position.Right} />}
    </div>
  );
}
