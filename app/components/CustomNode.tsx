import { Handle, Position, NodeProps } from '@xyflow/react'
import { theme } from '../styles/theme'
import { Card } from './ui/Card'
import { Button } from './ui/Button'

export interface CustomNodeData {
  label: string
  content: string
  type: 'note' | 'commentary' | 'reflection'
  createdAt: string
  [key: string]: unknown
}

const typeColors = {
  note: theme.colors.primary[100],
  commentary: theme.colors.books['创世记'],
  reflection: theme.colors.books['出埃及记'],
} as const

type NodeType = keyof typeof typeColors

export function CustomNode({
  data,
  selected,
}: NodeProps<{ data: CustomNodeData }>) {
  const nodeType = data.type as NodeType
  const backgroundColor = typeColors[nodeType]

  return (
    <Card
      variant="elevated"
      padding="md"
      className={`w-64 transition-all duration-200 ${
        selected ? 'ring-2 ring-primary-500 ring-offset-2' : ''
      }`}
      style={{ background: backgroundColor }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 !border-gray-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400 !border-gray-500"
      />
      
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-gray-900">{data.label}</h3>
          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
            {data.type}
          </span>
        </div>
        <p className="text-sm text-gray-700 line-clamp-3">{data.content}</p>
        <div className="text-xs text-gray-500">
          {new Date(data.createdAt).toLocaleDateString()}
        </div>
      </div>
    </Card>
  )
} 