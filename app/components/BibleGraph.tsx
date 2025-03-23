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
  SelectionMode,
  MarkerType,
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
  transition: `all 0.2s ease-in-out`,
  '&:hover': {
    boxShadow: `0 12px 20px -10px ${theme.colors.primary[300]}`,
    transform: 'translateY(-3px) scale(1.02)',
    borderColor: theme.colors.primary[500],
    borderWidth: '2px',
    zIndex: 10,
    filter: 'brightness(1.1)',
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
  pathOptions: {
    offset: 15,
    borderRadius: 5,
  }
}

// Add edge styling for expanded node connections
const expandedEdgeStyle = {
  ...edgeStyle,
  stroke: theme.colors.primary[500], // Brighter color
  strokeWidth: 4, // Thicker line
  strokeDasharray: '5, 3', // More pronounced dashed pattern
  animate: true, 
  animationSpeed: 15, // Faster animation
  opacity: 0.9, // Slightly transparent
  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))', // Add shadow for depth
  transition: 'all 0.3s ease', // Smooth transition of properties
  '&:hover': {
    strokeWidth: 5,
    stroke: theme.colors.primary[600],
    opacity: 1,
  },
}

// Define edge styles for Bible navigator selected verses
const selectedVerseEdgeStyle = {
  ...edgeStyle,
  stroke: '#E53E3E', // Use a hardcoded red color since theme doesn't have red
  strokeWidth: 3,
  opacity: 0.9,
  filter: 'drop-shadow(0 1px 3px rgba(220, 38, 38, 0.4))', // Add red glow shadow
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
  
  // Track the last focused verse to prevent unnecessary re-focusing
  const [lastFocusedVerseId, setLastFocusedVerseId] = useState<string | null>(null)
  // Track if user has manually navigated the graph
  const [userHasNavigated, setUserHasNavigated] = useState(false)

  const { getNodes, getNode } = useReactFlow()
  const reactFlowInstance = useReactFlow()

  // Add new state for expanded nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // Add loading state tracking
  const [loadingVerses, setLoadingVerses] = useState(new Set<string>())
  const loadedPagesRef = useRef(new Set<string>())

  // Add state for additional features
  const [selectionMode, setSelectionMode] = useState(SelectionMode.Partial)
  const [showGrid, setShowGrid] = useState(true)
  const [nodeDraggable, setNodeDraggable] = useState(true)
  const [nodeConnectable, setNodeConnectable] = useState(false)
  const [deleteKeyPressed, setDeleteKeyPressed] = useState(false)
  const [edgeType, setEdgeType] = useState('smoothstep')
  const [edgeMarkerEnd, setEdgeMarkerEnd] = useState(MarkerType.Arrow)
  const [shiftKeyActive, setShiftKeyActive] = useState(false)

  // Add state to track if we had NaN errors
  const [hasFixedNaN, setHasFixedNaN] = useState(false)
  
  // Add keyboard event handlers for shift key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShiftKeyActive(true);
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShiftKeyActive(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Simple utility to fix NaN positions in nodes
  const validateAndFixNodePositions = useCallback(() => {
    const hasInvalidPositions = flowNodes.some(
      node => isNaN(node.position.x) || isNaN(node.position.y)
    );
    
    if (hasInvalidPositions) {
      console.warn('Found NaN positions in nodes, fixing...');
      const fixedNodes = flowNodes.map(node => ({
        ...node,
        position: {
          x: isNaN(node.position.x) ? 0 : node.position.x,
          y: isNaN(node.position.y) ? 0 : node.position.y
        }
      }));
      setFlowNodes(fixedNodes);
      setHasFixedNaN(true);
      return true;
    }
    
    return false;
  }, [flowNodes, setFlowNodes]);
  
  // Run position validation when nodes change
  useEffect(() => {
    if (flowNodes.length > 0) {
      validateAndFixNodePositions();
    }
  }, [flowNodes, validateAndFixNodePositions]);

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
      
      // Set user has navigated to true when clicking on a node
      setUserHasNavigated(true);
      
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

        // Add edge with enhanced styling for expanded connections
        const edgeId = createUniqueEdgeId(nodeId, targetId)
        if (!flowEdges.some(e => e.id === edgeId) && !newEdges.some(e => e.id === edgeId)) {
          newEdges.push({
            id: edgeId,
            source: nodeId,
            target: targetId,
            type: 'smoothstep', // Smoother curves for better visibility
            animated: true, // Add animation for better visibility
            style: expandedEdgeStyle,
            data: { 
              isExpansionEdge: true,
              label: 'Reference', // Add a label to show this is a reference connection
              sourceVerse: `${book} ${chapter}:${verse}`,
              targetVerse: `${rel.target_book} ${rel.target_chapter}:${rel.target_verse}`,
              relationship: 'Cross-reference' // Set a default relationship type
            },
            markerEnd: {
              type: MarkerType.ArrowClosed, // Add a more prominent arrow
              width: 15,
              height: 15,
              color: theme.colors.primary[500]
            },
            // Show edge text on hover
            label: '→',
            labelStyle: { 
              fill: theme.colors.primary[700], 
              fontWeight: 'bold',
              fontSize: 14
            },
            labelBgStyle: { 
              fill: 'white', 
              fillOpacity: 0.8,
              borderRadius: 4
            }
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
  }, [expandedNodes, flowNodes, reactFlowInstance, calculateOptimalLayout, expandedEdgeStyle])

  // Add event handler for edge mouse enter/leave to show edge data
  const onEdgeMouseEnter = useCallback((event: React.MouseEvent, edge: Edge) => {
    if (edge.data) {
      // Create a tooltip element with edge data
      const tooltip = document.createElement('div');
      tooltip.id = `edge-tooltip-${edge.id}`;
      tooltip.className = 'edge-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.left = `${event.clientX + 10}px`;
      tooltip.style.top = `${event.clientY + 10}px`;
      tooltip.style.backgroundColor = 'white';
      tooltip.style.padding = '8px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      tooltip.style.zIndex = '1000';
      tooltip.style.fontSize = '12px';
      tooltip.style.maxWidth = '250px';
      
      // Add edge data to tooltip
      let tooltipContent = '';
      if (edge.data.sourceVerse && edge.data.targetVerse) {
        tooltipContent += `<div><strong>From:</strong> ${edge.data.sourceVerse}</div>`;
        tooltipContent += `<div><strong>To:</strong> ${edge.data.targetVerse}</div>`;
      }
      if (edge.data.relationship) {
        tooltipContent += `<div><strong>Type:</strong> ${edge.data.relationship}</div>`;
      }
      if (edge.data.label) {
        tooltipContent += `<div><strong>Connection:</strong> ${edge.data.label}</div>`;
      }
      
      tooltip.innerHTML = tooltipContent || 'Connection';
      document.body.appendChild(tooltip);
    }
  }, []);

  const onEdgeMouseLeave = useCallback((event: React.MouseEvent, edge: Edge) => {
    // Remove tooltip when mouse leaves edge
    const tooltip = document.getElementById(`edge-tooltip-${edge.id}`);
    if (tooltip) {
      document.body.removeChild(tooltip);
    }
  }, []);

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

      // Check if this is an expansion edge (created by double-click)
      const isExpansionEdge = edge.data?.isExpansionEdge === true;
      const sourceNodeExpanded = expandedNodes.has(edge.source);
      
      if (selectedVerse) {
        const selectedVerseId = `${selectedVerse.book}-${selectedVerse.chapter}-${selectedVerse.verse}`
        const isConnected = edge.source === selectedVerseId || edge.target === selectedVerseId

        // Prioritize expansion edge styling over selection styling
        if (isExpansionEdge || sourceNodeExpanded) {
          return {
            ...edge,
            hidden: false,
            animated: true,
            type: 'straight',
            style: {
              ...expandedEdgeStyle,
              opacity: 1,
            },
          };
        }

        // Apply red color for edges connected to the selected verse
        if (isConnected) {
          return {
            ...edge,
            hidden: false,
            animated: true,
            style: selectedVerseEdgeStyle,
            // Add hover interactivity for edge text
            interactionWidth: 10, // Wider area for mouse interaction
          }
        }

        return {
          ...edge,
          hidden: false,
          ...defaultEdgeOptions,
          style: {
            ...edgeStyle,
            opacity: isConnected ? 1 : 0.1,
            strokeWidth: isConnected ? 3 : 1,
            stroke: isConnected ? theme.colors.gray[400] : theme.colors.gray[400],
          },
        }
      }

      // Prioritize expansion edge styling
      if (isExpansionEdge || sourceNodeExpanded) {
        return {
          ...edge,
          hidden: false,
          animated: true,
          type: 'straight',
          style: expandedEdgeStyle,
        };
      }

      return {
        ...edge,
        hidden: false,
        ...defaultEdgeOptions,
        // Enable edge text display on hover for all edges
        interactionWidth: 10,
      }
    })
  }, [flowEdges, filteredNodes, selectedVerse, expandedNodes, expandedEdgeStyle, selectedVerseEdgeStyle])

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

  // Track when user manually navigates the graph
  const handleViewportChange = useCallback(() => {
    setUserHasNavigated(true);
  }, []);

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

    // Only center the view if:
    // 1. This is a different verse than the last focused one, AND
    // 2. The user hasn't manually navigated yet
    if (verseId !== lastFocusedVerseId && !userHasNavigated) {
      const node = flowNodes.find(n => n.id === verseId)
      if (node && reactFlowInstance) {
        // Focus on the verse
        reactFlowInstance.setCenter(node.position.x, node.position.y, { 
          duration: 800,
          zoom: reactFlowInstance.getZoom() // maintain current zoom level
        });
        
        // Remember we've focused on this verse
        setLastFocusedVerseId(verseId);
        // Reset the user navigation flag when we focus on a new verse
        setUserHasNavigated(false);
        
        console.log(`Focused on verse: ${verseId}`);
      }
    }
  }, [selectedVerse, isInitialized, verseExistsInGraph, loadAdditionalData, 
      loadingVerses, flowNodes, reactFlowInstance, lastFocusedVerseId, userHasNavigated]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading graph data...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={nodeDraggable}
        nodesConnectable={nodeConnectable}
        snapToGrid={showGrid}
        snapGrid={[15, 15]}
        selectionMode={selectionMode}
        selectionOnDrag
        multiSelectionKeyCode="Control"
        panOnDrag={!shiftKeyActive}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        onMove={handleViewportChange}
        key={`flow-${hasFixedNaN ? 'fixed' : 'normal'}-${flowNodes.length}`}
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