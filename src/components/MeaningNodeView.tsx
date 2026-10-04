import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { NodeKind, ValueCategory } from '../domain/types';

export type MeaningNodeData = {
  kind: NodeKind;
  label: string;
  category?: ValueCategory;
  onPath: boolean;
};

export type MeaningFlowNode = Node<MeaningNodeData, 'meaning'>;

const CATEGORY_LABEL: Record<ValueCategory, string> = {
  emotion: '감정',
  utility: '효용',
};

/** action: 오른쪽 출구만 / fun: 왼쪽 입구만 / value: 양쪽 */
export function MeaningNodeView({ data }: NodeProps<MeaningFlowNode>) {
  const { kind, label, category, onPath } = data;
  return (
    <div className={`meaning-node ${kind} ${category ?? ''} ${onPath ? 'on-path' : ''}`}>
      {kind !== 'action' && <Handle type="target" position={Position.Left} />}
      {kind === 'value' && category && <span className="tag">{CATEGORY_LABEL[category]}</span>}
      <div className="label">{label}</div>
      {kind !== 'fun' && <Handle type="source" position={Position.Right} />}
    </div>
  );
}
