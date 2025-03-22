'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Position,
  Connection,
  useReactFlow,
  NodeTypes,
  NodeProps,
  ReactFlowInstance,
  XYPosition,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useBibleReader } from '../hooks/useBibleReader'
import { ReadingPanel } from './ReadingPanel'
import { HistoryPanel } from './HistoryPanel'
import { AddNodePanel } from './AddNodePanel'
import { CustomNode } from './CustomNode'
import { Button } from './ui/Button'
import { theme } from '../styles/theme'

interface GraphData {
  source_book: string
  source_chapter: number
  source_verse: number
  target_book: string
  target_chapter: number
  target_verse: number
}

interface VerseData {
  book: string
  chapter: number
  verse: number
  text: string
}

interface BibleNodeData extends Record<string, unknown> {
  label: string
  book: string
  chapter: number
  verse: number
}

export interface CustomNodeData extends Record<string, unknown> {
  label: string
  type: 'note' | 'commentary' | 'reflection'
  content: string
  createdAt: string
}

type BibleNode = Node<BibleNodeData>
type CustomNodeType = Node<CustomNodeData>
type FlowNode = BibleNode | CustomNodeType

type BookName = keyof typeof theme.colors.books

const nodeColors = theme.colors.books

const nodeStyle = {
  padding: theme.spacing[4],
  borderRadius: theme.spacing[2],
  fontSize: '12px',
  width: 200,
  boxShadow: theme.shadows.md,
  border: '1px solid rgba(0, 0, 0, 0.1)',
  transition: `all ${theme.transitions.normal}`,
  '&:hover': {
    boxShadow: theme.shadows.lg,
    transform: 'translateY(-2px)',
  },
}

const edgeStyle = {
  stroke: theme.colors.gray[400],
  strokeWidth: 2,
  transition: `all ${theme.transitions.normal}`,
  '&:hover': {
    stroke: theme.colors.primary[500],
    strokeWidth: 3,
  },
}

const typeColors = {
  note: theme.colors.primary[500],
  commentary: theme.colors.primary[600],
  reflection: theme.colors.primary[700],
} as const

const nodeTypes: NodeTypes = {
  custom: CustomNode as unknown as React.ComponentType<NodeProps>,
}

const DEFAULT_POSITION: XYPosition = { x: 0, y: 0 }

function BibleGraphContent() {
  const [nodes, setNodes] = useState<FlowNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVerse, setSelectedVerse] = useState<VerseData | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBook, setSelectedBook] = useState<string | null>(null)
  const [books, setBooks] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showAddNode, setShowAddNode] = useState(false)
  const [showEditNode, setShowEditNode] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [bibleNodes, setBibleNodes] = useState<BibleNode[]>([])

  const {
    readingHistory,
    bookmarks,
    notes,
    customNodes,
    currentVerseId,
    addToHistory,
    addBookmark,
    removeBookmark,
    addNote,
    updateNote,
    deleteNote,
    addCustomNode,
    updateCustomNode,
    updateCustomNodePosition,
    deleteCustomNode,
    setCurrentVerse,
    getVerseNotes,
    isBookmarked,
  } = useBibleReader()

  const { getNodes, getNode, setNodes: setFlowNodes } = useReactFlow<FlowNode>()
  const reactFlowInstance = useReactFlow<FlowNode>()

  // Update nodes when customNodes or bibleNodes change
  useEffect(() => {
    const newCustomNodes: CustomNodeType[] = customNodes.map((node) => ({
      id: node.id,
      type: 'custom',
      position: node.position,
      data: node,
    }))

    setNodes([...bibleNodes, ...newCustomNodes])
  }, [customNodes, bibleNodes])

  const handleAddCustomNode = useCallback((nodeData: CustomNodeData) => {
    const viewport = reactFlowInstance.getViewport()
    const pos = {
      x: -viewport.x + window.innerWidth / 2,
      y: -viewport.y + window.innerHeight / 2,
    }
    addCustomNode(nodeData, pos)
  }, [reactFlowInstance, addCustomNode])

  const handleUpdateCustomNode = useCallback((id: string, nodeData: Partial<CustomNodeData>) => {
    updateCustomNode(id, nodeData)
    setShowEditNode(null)
  }, [updateCustomNode])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Handle position changes for custom nodes
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          const node = nodes.find((n) => n.id === change.id)
          if (node && !('book' in node.data)) {
            updateCustomNodePosition(node.id, change.position)
          }
        }
      })

      // Apply changes to nodes state
      const updatedNodes = applyNodeChanges(changes, nodes) as FlowNode[]
      
      // Update bibleNodes if the change affects them
      const updatedBibleNodes = updatedNodes.filter((node): node is BibleNode => 'book' in node.data)
      if (updatedBibleNodes.length !== bibleNodes.length) {
        setBibleNodes(updatedBibleNodes)
      }

      setNodes(updatedNodes)
    },
    [nodes, updateCustomNodePosition, bibleNodes]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds))
    },
    []
  )

  const onNodeClick = useCallback(async (event: React.MouseEvent, node: FlowNode) => {
    try {
      if ('book' in node.data) {
        // Handle Bible node click
        const { book, chapter, verse } = node.data
        const response = await fetch(
          `http://localhost:8000/verses/${book}/${chapter}/${verse}`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch verse details')
        }
        const data = await response.json()
        setSelectedVerse(data)
        const verseId = `${data.book}-${data.chapter}-${data.verse}`
        setCurrentVerse(verseId)
      } else {
        // Handle custom node click - open edit panel
        setShowEditNode(node.id)
      }
    } catch (err) {
      console.error('Error handling node click:', err)
      setError('Failed to load verse data')
    }
  }, [setCurrentVerse])

  const handleAddNote = useCallback((text: string) => {
    if (selectedVerse) {
      const verseId = `${selectedVerse.book}-${selectedVerse.chapter}-${selectedVerse.verse}`
      addNote(verseId, text)
    }
  }, [selectedVerse, addNote])

  const handleToggleBookmark = useCallback(() => {
    if (selectedVerse) {
      const verseId = `${selectedVerse.book}-${selectedVerse.chapter}-${selectedVerse.verse}`
      if (isBookmarked(verseId)) {
        removeBookmark(verseId)
      } else {
        addBookmark(verseId, 'Quick bookmark')
      }
    }
  }, [selectedVerse, isBookmarked, removeBookmark, addBookmark])

  const getNodeColor = (bookName: string) => {
    return (bookName in nodeColors)
      ? nodeColors[bookName as BookName]
      : theme.colors.gray[50]
  }

  const fetchGraphData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching graph data...')
      
      const response = await fetch('http://localhost:8000/graph-data')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: GraphData[] = await response.json()
      console.log(`Received ${data.length} records from API`)
      
      if (data.length === 0) {
        setError('No graph data available')
        return
      }
      
      // Extract unique books
      const uniqueBooks = Array.from(
        new Set([
          ...data.map((item) => item.source_book),
          ...data.map((item) => item.target_book),
        ])
      ).sort()
      setBooks(uniqueBooks)
      
      // Create nodes and edges from the data
      const newNodes: BibleNode[] = []
      const newEdges: Edge[] = []
      const nodeMap = new Map<string, BibleNode>()

      data.forEach((item, index) => {
        // Create source node
        const sourceId = `${item.source_book}-${item.source_chapter}-${item.source_verse}`
        if (!nodeMap.has(sourceId)) {
          const node: BibleNode = {
            id: sourceId,
            type: 'default',
            position: { x: index * 250, y: 0 },
            data: {
              label: `${item.source_book} ${item.source_chapter}:${item.source_verse}`,
              book: item.source_book,
              chapter: item.source_chapter,
              verse: item.source_verse,
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            style: {
              ...nodeStyle,
              background: getNodeColor(item.source_book),
            },
          }
          nodeMap.set(sourceId, node)
          newNodes.push(node)
        }

        // Create target node
        const targetId = `${item.target_book}-${item.target_chapter}-${item.target_verse}`
        if (!nodeMap.has(targetId)) {
          const node: BibleNode = {
            id: targetId,
            type: 'default',
            position: { x: index * 250, y: 150 },
            data: {
              label: `${item.target_book} ${item.target_chapter}:${item.target_verse}`,
              book: item.target_book,
              chapter: item.target_chapter,
              verse: item.target_verse,
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            style: {
              ...nodeStyle,
              background: getNodeColor(item.target_book),
            },
          }
          nodeMap.set(targetId, node)
          newNodes.push(node)
        }

        // Create edge
        newEdges.push({
          id: `${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          type: 'smoothstep',
          animated: true,
          style: edgeStyle,
        })
      })

      console.log(`Created ${newNodes.length} nodes and ${newEdges.length} edges`)
      setBibleNodes(newNodes)
      setEdges(newEdges)
    } catch (error) {
      console.error('Error fetching graph data:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  // Filter nodes based on search term and selected book
  const filteredNodes = nodes.filter((node) => {
    const matchesSearch = searchTerm
      ? node.data.label.toLowerCase().includes(searchTerm.toLowerCase())
      : true
    const matchesBook = selectedBook 
      ? 'book' in node.data && node.data.book === selectedBook 
      : true
    return matchesSearch && matchesBook
  })

  // Filter edges to only include connections between visible nodes
  const filteredEdges = edges.filter((edge) => {
    const sourceNode = filteredNodes.find((node) => node.id === edge.source)
    const targetNode = filteredNodes.find((node) => node.id === edge.target)
    return sourceNode && targetNode
  })

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    setEdges((eds) => [
      ...eds,
      {
        id: `edge-${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        type: 'smoothstep',
        animated: true,
        style: edgeStyle,
      },
    ])
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading graph data...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        onConnectStart={() => setConnecting(true)}
        onConnectEnd={() => setConnecting(false)}
      >
        <Background
          color={theme.colors.gray[200]}
          gap={16}
          size={1}
        />
        <Controls
          showInteractive={false}
          className="bg-white shadow-lg rounded-lg"
        />
        <MiniMap
          nodeColor={(node: FlowNode) => {
            if ('book' in node.data) {
              return getNodeColor(node.data.book as string)
            }
            return typeColors[node.data.type as keyof typeof typeColors]
          }}
          maskColor={theme.colors.gray[50]}
          className="bg-white shadow-lg rounded-lg"
        />
        <Panel position="top-left" className="bg-white p-4 rounded-lg shadow-lg">
          <div className="space-y-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                Search Verses
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="book" className="block text-sm font-medium text-gray-700">
                Filter by Book
              </label>
              <select
                id="book"
                value={selectedBook || ''}
                onChange={(e) => setSelectedBook(e.target.value || null)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">All Books</option>
                {books.map((book) => (
                  <option key={book} value={book}>
                    {book}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Button
                variant="primary"
                onClick={() => setShowAddNode(true)}
                className="w-full"
              >
                Add Custom Node
              </Button>
            </div>
            <div>
              <Button
                variant="outline"
                onClick={() => setShowHistory((prev) => !prev)}
                className="w-full"
              >
                {showHistory ? 'Hide History' : 'Show History'}
              </Button>
            </div>
          </div>
        </Panel>
        {connecting && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg text-sm text-gray-600">
            Click another node to create a connection
          </div>
        )}
        {showAddNode && (
          <Panel position="top-center">
            <AddNodePanel
              onAddNode={handleAddCustomNode}
              onClose={() => setShowAddNode(false)}
            />
          </Panel>
        )}
        {showEditNode && (
          <Panel position="top-center">
            <AddNodePanel
              initialData={nodes.find((n) => n.id === showEditNode && !('book' in n.data))?.data as CustomNodeData}
              onAddNode={(data) => handleUpdateCustomNode(showEditNode, data)}
              onDelete={() => {
                deleteCustomNode(showEditNode)
                setShowEditNode(null)
              }}
              onClose={() => setShowEditNode(null)}
            />
          </Panel>
        )}
        {selectedVerse && (
          <Panel position="top-right" className="bg-white p-4 rounded-lg shadow-lg">
            <ReadingPanel
              verse={selectedVerse}
              notes={getVerseNotes(`${selectedVerse.book}-${selectedVerse.chapter}-${selectedVerse.verse}`).map(note => ({
                ...note,
                verseId: `${selectedVerse.book}-${selectedVerse.chapter}-${selectedVerse.verse}`,
                createdAt: new Date(note.createdAt),
              }))}
              isBookmarked={isBookmarked(`${selectedVerse.book}-${selectedVerse.chapter}-${selectedVerse.verse}`)}
              onAddNote={handleAddNote}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
              onToggleBookmark={handleToggleBookmark}
              onClose={() => setSelectedVerse(null)}
            />
          </Panel>
        )}
        {showHistory && (
          <Panel position="bottom-right" className="bg-white p-4 rounded-lg shadow-lg">
            <HistoryPanel
              history={readingHistory.map(item => ({
                ...item,
                timestamp: new Date(item.timestamp),
              }))}
              bookmarks={Object.values(bookmarks).map(bookmark => ({
                id: bookmark.id,
                verseId: bookmark.id,
                label: bookmark.description,
                createdAt: new Date(bookmark.createdAt),
              }))}
              onSelectVerse={(verseId) => {
                const [book, chapter, verse] = verseId.split('-')
                fetch(
                  `http://localhost:8000/verses/${book}/${chapter}/${verse}`
                )
                  .then((res) => res.json())
                  .then((data) => {
                    setSelectedVerse(data)
                    setCurrentVerse(verseId)
                  })
                  .catch((error) => {
                    console.error('Error fetching verse details:', error)
                  })
              }}
              onRemoveBookmark={removeBookmark}
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  )
}

export function BibleGraph() {
  return (
    <ReactFlowProvider>
      <BibleGraphContent />
    </ReactFlowProvider>
  )
} 