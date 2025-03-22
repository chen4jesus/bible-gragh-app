'use client'

import { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { CustomNodeData } from './BibleGraph'

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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="label" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            id="label"
            type="text"
            value={nodeData.label}
            onChange={(e) => setNodeData((prev) => ({ ...prev, label: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Type
          </label>
          <select
            id="type"
            value={nodeData.type}
            onChange={(e) => setNodeData((prev) => ({ ...prev, type: e.target.value as NodeFormData['type'] }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="note">Note</option>
            <option value="commentary">Commentary</option>
            <option value="reflection">Reflection</option>
          </select>
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            Content
          </label>
          <textarea
            id="content"
            value={nodeData.content}
            onChange={(e) => setNodeData((prev) => ({ ...prev, content: e.target.value }))}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>
        <div className="flex justify-between space-x-2">
          <div className="flex-1 flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
            >
              {initialData ? 'Update' : 'Add'} Node
            </Button>
          </div>
          {initialData && onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              className="flex-none"
            >
              Delete
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
} 