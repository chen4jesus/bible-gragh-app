'use client'

import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
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
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
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

type BibleNode = Node<BibleNodeData>
type FlowNode = BibleNode

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

// Add default edge options
const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: edgeStyle,
}

interface BibleGraphProps {
  selectedVerse?: {
    book: string
    chapter: number
    verse: number
  } | null
}

function createUniqueEdgeId(source: string, target: string): string {
  // Sort the IDs to ensure consistent edge IDs regardless of direction
  const [first, second] = [source, target].sort()
  return `edge-${first}-${second}`
}

function BibleGraphContent({ selectedVerse }: BibleGraphProps) {
  // Internal state for React Flow
  const [flowNodes, setFlowNodes] = useState<Node<BibleNodeData>[]>([])
  const [flowEdges, setFlowEdges] = useState<Edge[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Application state
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeVerse, setActiveVerse] = useState<VerseData | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBook, setSelectedBook] = useState<string | null>(null)
  const [books, setBooks] = useState<string[]>([])

  const { getNodes, getNode } = useReactFlow<FlowNode>()
  const reactFlowInstance = useReactFlow<FlowNode>()

  // Add new state for expanded nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // Add loading state tracking
  const [loadingVerses, setLoadingVerses] = useState(new Set<string>())
  const loadedPagesRef = useRef(new Set<string>())

  // Load initial Bible graph data
  useEffect(() => {
    if (isInitialized) return

    async function fetchGraphData() {
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

          // Create edge with consistent styling and unique ID
          const edgeId = createUniqueEdgeId(sourceId, targetId)
          if (!newEdges.some(e => e.id === edgeId)) {
            newEdges.push({
              id: edgeId,
              source: sourceId,
              target: targetId,
              ...defaultEdgeOptions,
            })
          }
        })

        console.log(`Created ${newNodes.length} nodes and ${newEdges.length} edges`)
        
        setFlowNodes(newNodes)
        setFlowEdges(newEdges)
        setIsInitialized(true)
      } catch (error) {
        console.error('Error fetching graph data:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchGraphData()
  }, [isInitialized])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setFlowNodes((nds) => applyNodeChanges(changes, nds) as Node<BibleNodeData>[])
    },
    []
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setFlowEdges((eds) => applyEdgeChanges(changes, eds))
    },
    []
  )

  const onNodeClick = useCallback(async (event: React.MouseEvent, node: Node<BibleNodeData>) => {
    try {
      const { book, chapter, verse } = node.data
      const response = await fetch(
        `http://localhost:8000/verses/${book}/${chapter}/${verse}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch verse details')
      }
      const data = await response.json()
      setActiveVerse(data)
    } catch (err) {
      console.error('Error handling node click:', err)
      setError('Failed to load verse data')
    }
  }, [])

  // Add helper function for calculating optimal layout
  const calculateOptimalLayout = useCallback((
    centerNode: Node<BibleNodeData>,
    relationshipCount: number,
    existingNodes: Node<BibleNodeData>[]
  ) => {
    // Calculate the average distance between existing nodes
    let avgDistance = 250 // default spacing
    if (existingNodes.length > 1) {
      const distances: number[] = []
      existingNodes.forEach((node, i) => {
        if (i > 0) {
          const prevNode = existingNodes[i - 1]
          const distance = Math.sqrt(
            Math.pow(node.position.x - prevNode.position.x, 2) +
            Math.pow(node.position.y - prevNode.position.y, 2)
          )
          distances.push(distance)
        }
      })
      avgDistance = distances.length > 0 
        ? distances.reduce((a, b) => a + b, 0) / distances.length
        : 250
    }

    // Adjust radius based on number of relationships and average distance
    const baseRadius = Math.min(avgDistance * 0.8, 300)
    const radius = Math.max(
      baseRadius,
      Math.min(baseRadius * Math.sqrt(relationshipCount / 4), 400)
    )

    // Calculate optimal positions in a circular layout
    const positions: { x: number; y: number }[] = []
    const angleStep = (2 * Math.PI) / relationshipCount
    
    for (let i = 0; i < relationshipCount; i++) {
      const angle = i * angleStep
      // Add some randomness to prevent perfect circle formation
      const radiusVariation = radius * (0.9 + Math.random() * 0.2)
      positions.push({
        x: centerNode.position.x + Math.cos(angle) * radiusVariation,
        y: centerNode.position.y + Math.sin(angle) * radiusVariation
      })
    }

    return positions
  }, [])

  // Update double click handler
  const onNodeDoubleClick = useCallback(async (event: React.MouseEvent, clickedNode: Node<BibleNodeData>) => {
    try {
      const { book, chapter, verse } = clickedNode.data
      const nodeId = `${book}-${chapter}-${verse}`
      
      // Toggle expanded state
      const expandedNodesArray = Array.from(expandedNodes)
      if (expandedNodes.has(nodeId)) {
        const newExpandedNodes = new Set(expandedNodesArray.filter(id => id !== nodeId))
        setExpandedNodes(newExpandedNodes)
        return
      }

      // Fetch related verses from the API
      const response = await fetch(
        `http://localhost:8000/cross-references/${book}/${chapter}/${verse}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch verse cross-references')
      }
      
      const relationships: GraphData[] = await response.json()
      console.log(`Received ${relationships.length} relationships for ${nodeId}`)

      // Calculate optimal positions for new nodes
      const positions = calculateOptimalLayout(clickedNode, relationships.length, flowNodes)

      // Create new nodes and edges
      const newNodes: BibleNode[] = []
      const newEdges: Edge[] = []
      const existingNodeIds = new Set(flowNodes.map(n => n.id))

      relationships.forEach((rel, index) => {
        const targetId = `${rel.target_book}-${rel.target_chapter}-${rel.target_verse}`
        
        // Only add new nodes if they don't exist
        if (!existingNodeIds.has(targetId)) {
          const newNode: BibleNode = {
            id: targetId,
            type: 'default',
            position: positions[index],
            data: {
              label: `${rel.target_book} ${rel.target_chapter}:${rel.target_verse}`,
              book: rel.target_book,
              chapter: rel.target_chapter,
              verse: rel.target_verse,
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            style: {
              ...nodeStyle,
              background: getNodeColor(rel.target_book),
            },
          }
          newNodes.push(newNode)
        }

        // Add edge with consistent styling and unique ID
        const edgeId = createUniqueEdgeId(nodeId, targetId)
        if (!flowEdges.some(e => e.id === edgeId) && !newEdges.some(e => e.id === edgeId)) {
          newEdges.push({
            id: edgeId,
            source: nodeId,
            target: targetId,
            ...defaultEdgeOptions,
          })
        }
      })

      // Update state
      setFlowNodes(nodes => [...nodes, ...newNodes])
      setFlowEdges(edges => [...edges, ...newEdges])
      setExpandedNodes(new Set([...expandedNodesArray, nodeId]))

      // Center the view on the expanded area with a smoother transition
      if (reactFlowInstance) {
        // Calculate the bounding box of all visible nodes
        const visibleNodes = [...flowNodes, ...newNodes].filter(node => {
          const isExpanded = expandedNodes.has(node.id)
          const isNewlyExpanded = node.id === nodeId
          const isRelated = newEdges.some(e => 
            e.source === node.id || e.target === node.id
          )
          return isExpanded || isNewlyExpanded || isRelated
        })

        if (visibleNodes.length > 0) {
          const xCoords = visibleNodes.map(n => n.position.x)
          const yCoords = visibleNodes.map(n => n.position.y)
          const minX = Math.min(...xCoords)
          const maxX = Math.max(...xCoords)
          const minY = Math.min(...yCoords)
          const maxY = Math.max(...yCoords)
          const centerX = (minX + maxX) / 2
          const centerY = (minY + maxY) / 2

          reactFlowInstance.setCenter(centerX, centerY, { 
            duration: 800,
            zoom: Math.min(1, 800 / Math.max(maxX - minX, maxY - minY))
          })
        }
      }
    } catch (err) {
      console.error('Error handling node double click:', err)
      setError('Failed to load verse relationships')
    }
  }, [expandedNodes, flowNodes, reactFlowInstance, calculateOptimalLayout])

  const getNodeColor = (bookName: string) => {
    return (bookName in nodeColors)
      ? nodeColors[bookName as BookName]
      : theme.colors.gray[50]
  }

  // Filter nodes based on search term, selected book, and selected verse
  const filteredNodes = useMemo(() => {
    if (!flowNodes.length) return []

    return flowNodes.map((node) => {
      const matchesSearch = searchTerm
        ? node.data.label.toLowerCase().includes(searchTerm.toLowerCase())
        : true
      
      // If a verse is selected, show it and its connected nodes
      if (selectedVerse) {
        const selectedVerseId = `${selectedVerse.book}-${selectedVerse.chapter}-${selectedVerse.verse}`
        const connectedEdges = flowEdges.filter(
          e => e.source === selectedVerseId || e.target === selectedVerseId
        )
        const isConnected = node.id === selectedVerseId || 
          connectedEdges.some(e => e.source === node.id || e.target === node.id)
        
        // Show expanded nodes and their connections
        const isExpanded = expandedNodes.has(node.id) ||
          Array.from(expandedNodes).some(expandedId => {
            return flowEdges.some(e => 
              (e.source === expandedId && e.target === node.id) ||
              (e.target === expandedId && e.source === node.id)
            )
          })
        
        // Update node style based on connection and expansion status
        return {
          ...node,
          hidden: !(isConnected || isExpanded) || !matchesSearch,
          style: {
            ...node.style,
            opacity: (isConnected || isExpanded) ? 1 : 0.3,
            borderWidth: node.id === selectedVerseId || expandedNodes.has(node.id) ? 2 : 1,
            borderColor: expandedNodes.has(node.id) 
              ? theme.colors.primary[700]
              : node.id === selectedVerseId 
                ? theme.colors.primary[500] 
                : 'rgba(0, 0, 0, 0.1)',
            background: node.id === selectedVerseId 
              ? theme.colors.primary[100]
              : expandedNodes.has(node.id)
                ? theme.colors.primary[50]
                : getNodeColor(node.data.book),
          },
        }
      }
      
      // Otherwise, filter by selected book if any
      const matchesBook = selectedBook 
        ? node.data.book === selectedBook 
        : true

      return {
        ...node,
        hidden: !(matchesSearch && matchesBook),
        style: {
          ...node.style,
          opacity: 1,
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.1)',
          background: getNodeColor(node.data.book),
        },
      }
    })
  }, [flowNodes, searchTerm, selectedBook, selectedVerse, flowEdges, expandedNodes])

  // Filter and style edges based on visible nodes and selection
  const filteredEdges = useMemo(() => {
    if (!flowEdges.length) return []

    return flowEdges.map((edge) => {
      const sourceNode = filteredNodes.find((node) => node.id === edge.source && !node.hidden)
      const targetNode = filteredNodes.find((node) => node.id === edge.target && !node.hidden)
      
      if (!sourceNode || !targetNode) {
        return { ...edge, hidden: true }
      }

      if (selectedVerse) {
        const selectedVerseId = `${selectedVerse.book}-${selectedVerse.chapter}-${selectedVerse.verse}`
        const isConnected = edge.source === selectedVerseId || edge.target === selectedVerseId

        return {
          ...edge,
          hidden: false,
          ...defaultEdgeOptions,
          style: {
            ...edgeStyle,
            opacity: isConnected ? 1 : 0.1,
            strokeWidth: isConnected ? 3 : 1,
            stroke: isConnected ? theme.colors.primary[500] : theme.colors.gray[400],
          },
        }
      }

      return {
        ...edge,
        hidden: false,
        ...defaultEdgeOptions,
      }
    })
  }, [flowEdges, filteredNodes, selectedVerse])

  // Function to check if a verse exists in current data
  const verseExistsInGraph = useCallback((book: string, chapter: number, verse: number) => {
    const verseId = `${book}-${chapter}-${verse}`
    return flowNodes.some(node => node.id === verseId)
  }, [flowNodes])

  // Function to load additional graph data
  const loadAdditionalData = useCallback(async (book: string, chapter: number, verse: number) => {
    const verseId = `${book}-${chapter}-${verse}`
    const pageKey = `${book}-${chapter}`

    // Prevent duplicate loading
    if (loadingVerses.has(verseId) || loadedPagesRef.current.has(pageKey)) {
      console.log('Skipping load - already loading or loaded:', pageKey)
      return
    }

    try {
      setLoadingVerses(prev => new Set(prev).add(verseId))
      console.log('Fetching additional graph data for:', pageKey)
      
      const response = await fetch(`http://localhost:8000/graph-data?book=${book}&chapter=${chapter}&verse=${verse}&limit=100`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: GraphData[] = await response.json()
      console.log(`Received ${data.length} additional records for ${pageKey}`)
      
      if (data.length === 0) {
        console.log('No additional relationships found')
        loadedPagesRef.current.add(pageKey) // Mark this page as loaded even if empty
        return
      }

      // Create new nodes and edges from the data
      const newNodes: BibleNode[] = []
      const newEdges: Edge[] = []
      const existingNodeIds = new Set(flowNodes.map(n => n.id))

      data.forEach((item) => {
        // Process source nodes
        const sourceNodeId = `${item.source_book}-${item.source_chapter}-${item.source_verse}`
        if (!existingNodeIds.has(sourceNodeId)) {
          const baseX = (item.source_chapter * 250) % 2000
          const baseY = Math.floor(item.source_chapter / 8) * 200
          const node: BibleNode = {
            id: sourceNodeId,
            type: 'default',
            position: { 
              x: baseX + (item.source_verse * 50),
              y: baseY + (item.source_verse * 30)
            },
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
          newNodes.push(node)
          existingNodeIds.add(sourceNodeId)
        }

        // Process target nodes
        const targetNodeId = `${item.target_book}-${item.target_chapter}-${item.target_verse}`
        if (!existingNodeIds.has(targetNodeId)) {
          const baseX = (item.target_chapter * 250) % 2000
          const baseY = Math.floor(item.target_chapter / 8) * 200 + 150
          const node: BibleNode = {
            id: targetNodeId,
            type: 'default',
            position: { 
              x: baseX + (item.target_verse * 50),
              y: baseY + (item.target_verse * 30)
            },
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
          newNodes.push(node)
          existingNodeIds.add(targetNodeId)
        }

        // Create edge if it doesn't exist
        const edgeId = createUniqueEdgeId(sourceNodeId, targetNodeId)
        if (!flowEdges.some(e => e.id === edgeId) && !newEdges.some(e => e.id === edgeId)) {
          newEdges.push({
            id: edgeId,
            source: sourceNodeId,
            target: targetNodeId,
            ...defaultEdgeOptions,
          })
        }
      })

      // Batch update state
      if (newNodes.length > 0 || newEdges.length > 0) {
        setFlowNodes(nodes => [...nodes, ...newNodes])
        setFlowEdges(edges => [...edges, ...newEdges])
        
        // Update books list with new unique books
        const newBooks = Array.from(
          new Set([
            ...books,
            ...data.map(item => item.source_book),
            ...data.map(item => item.target_book),
          ])
        ).sort()
        setBooks(newBooks)

        console.log(`Added ${newNodes.length} nodes and ${newEdges.length} edges for ${pageKey}`)
      }

      // Mark this page as loaded
      loadedPagesRef.current.add(pageKey)

    } catch (error) {
      console.error('Error fetching additional graph data:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoadingVerses(prev => {
        const next = new Set(prev)
        next.delete(verseId)
        return next
      })
    }
  }, [flowNodes, flowEdges, books, loadingVerses, getNodeColor])

  // Effect to handle selected verse changes
  useEffect(() => {
    if (!selectedVerse || !isInitialized) return

    const { book, chapter, verse } = selectedVerse
    const verseId = `${book}-${chapter}-${verse}`
    
    // Check if the verse exists in current data
    if (!verseExistsInGraph(book, chapter, verse) && !loadingVerses.has(verseId)) {
      // Load additional data if verse not found and not currently loading
      loadAdditionalData(book, chapter, verse)
    }

    // Center view on the verse if it exists
    const node = flowNodes.find(n => n.id === verseId)
    if (node && reactFlowInstance) {
      reactFlowInstance.setCenter(node.position.x, node.position.y, { duration: 800 })
    }
  }, [selectedVerse, isInitialized, verseExistsInGraph, loadAdditionalData, loadingVerses, flowNodes])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading graph data...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
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
          nodeColor={(node) => getNodeColor(node.data.book as string)}
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
          </div>
        </Panel>
        {activeVerse && (
          <Panel position="top-right" className="bg-white p-4 rounded-lg shadow-lg">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {activeVerse.book} {activeVerse.chapter}:{activeVerse.verse}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{activeVerse.text}</p>
              </div>
              <button
                onClick={() => setActiveVerse(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  )
}

export function BibleGraph({ selectedVerse }: BibleGraphProps) {
  return (
    <ReactFlowProvider>
      <BibleGraphContent selectedVerse={selectedVerse} />
    </ReactFlowProvider>
  )
} 