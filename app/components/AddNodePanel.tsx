'use client'

import { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { CustomNodeData } from './BibleGraph'
import { useTranslations } from 'next-intl'

export interface AddNodePanelProps {
  initialData?: CustomNodeData
  onAddNode: (data: CustomNodeData) => void
  onDelete?: () => void
  onClose: () => void
}

type NodeFormData = {
  label: string
  type: 'note' | 'commentary' | 'reflection'
  content: string
}

export function AddNodePanel({
  initialData,
  onAddNode,
  onDelete,
  onClose,
}: AddNodePanelProps) {
  const t = useTranslations()
  const [nodeData, setNodeData] = useState<NodeFormData>(() => {
    if (initialData) {
      const { createdAt, ...rest } = initialData
      return rest
    }
    return {
      label: '',
      type: 'note',
      content: '',
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newNodeData: CustomNodeData = {
      ...nodeData,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    }
    onAddNode(newNodeData)
  }

  return (
    <Card className="w-96 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{t('addNodePanel.title')}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            id="label"
            type="text"
            value={nodeData.label}
            onChange={(e) => setNodeData({ ...nodeData, label: e.target.value })}
            required
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            id="type"
            value={nodeData.type}
            onChange={(e) => setNodeData({ ...nodeData, type: e.target.value as any })}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="note">Note</option>
            <option value="commentary">Commentary</option>
            <option value="reflection">Reflection</option>
          </select>
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Content
          </label>
          <textarea
            id="content"
            value={nodeData.content}
            onChange={(e) => setNodeData({ ...nodeData, content: e.target.value })}
            rows={5}
            required
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex justify-end space-x-2">
          {onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Delete
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {t('addNodePanel.add')}
          </Button>
        </div>
      </form>
    </Card>
  )
} 