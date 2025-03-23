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
  },
  markerEnd: {
    type: MarkerType.Arrow,
    width: 10,
    height: 10,
    color: theme.colors.gray[400],
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
  stroke: '#db9004', // Use a hardcoded red color since theme doesn't have red
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
  
  // Add a new state to track currently selected node for expansion
  const [selectedNodeForExpansion, setSelectedNodeForExpansion] = useState<BibleNode | null>(null);

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
      
      // Store the selected node for expansion option
      setSelectedNodeForExpansion(node as BibleNode);
      
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

  // Add a manual expand function using the stored node
  const expandSelectedNode = useCallback(() => {
    if (!selectedNodeForExpansion) return;
    
    // This will use the same logic as the previous onNodeDoubleClick handler
    // but triggered manually through a button
    const { book, chapter, verse } = selectedNodeForExpansion.data;
    const nodeId = `${book}-${chapter}-${verse}`;
    
    // Focus immediately on the clicked node with a zoom animation
    if (reactFlowInstance) {
      reactFlowInstance.setCenter(
        selectedNodeForExpansion.position.x, 
        selectedNodeForExpansion.position.y, 
        { duration: 400, zoom: 1.2 }
      );
    }
    
    // Toggle expanded state
    const expandedNodesArray = Array.from(expandedNodes);
    if (expandedNodes.has(nodeId)) {
      const newExpandedNodes = new Set(expandedNodesArray.filter(id => id !== nodeId));
      setExpandedNodes(newExpandedNodes);
      return;
    }

    // Show loading indicator for this specific node
    setLoadingVerses(prev => new Set(prev).add(nodeId));
    
    // Fetch related verses from the API
    fetch(`http://localhost:8000/cross-references/${book}/${chapter}/${verse}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch verse cross-references');
        }
        return response.json();
      })
      .then((relationships: GraphData[]) => {
        console.log(`Received ${relationships.length} relationships for ${nodeId}`);

        // Calculate optimal positions for new nodes
        const positions = calculateOptimalLayout(selectedNodeForExpansion, relationships.length, flowNodes);

        // Create new nodes and edges
        const newNodes: BibleNode[] = [];
        const newEdges: Edge[] = [];
        const existingNodeIds = new Set(flowNodes.map(n => n.id));

        relationships.forEach((rel, index) => {
          const targetId = `${rel.target_book}-${rel.target_chapter}-${rel.target_verse}`;
          
          // Only add new nodes if they don't exist
          if (!existingNodeIds.has(targetId) && !newNodes.some(n => n.id === targetId)) {
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
            };
            newNodes.push(newNode);
          }

          // Add edge with enhanced styling for expanded connections
          const edgeId = createUniqueEdgeId(nodeId, targetId);
          if (!flowEdges.some(e => e.id === edgeId) && !newEdges.some(e => e.id === edgeId)) {
            newEdges.push({
              id: edgeId,
              source: nodeId,
              target: targetId,
              type: 'smoothstep',
              animated: true,
              style: expandedEdgeStyle,
              data: { 
                isExpansionEdge: true,
                label: 'Reference',
                sourceVerse: `${book} ${chapter}:${verse}`,
                targetVerse: `${rel.target_book} ${rel.target_chapter}:${rel.target_verse}`,
                relationship: 'Cross-reference'
              },
              markerEnd: {
                type: MarkerType.Arrow,
                width: 10,
                height: 10,
                color: theme.colors.primary[500]
              },
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
            });
          }
        });

        // Update state
        setFlowNodes(nodes => [...nodes, ...newNodes]);
        setFlowEdges(edges => [...edges, ...newEdges]);
        setExpandedNodes(new Set([...expandedNodesArray, nodeId]));

        // After loading is complete, zoom out slightly to show surrounding nodes
        if (reactFlowInstance && newNodes.length > 0) {
          setTimeout(() => {
            // Calculate the appropriate zoom level based on the number of new nodes
            const zoomLevel = Math.max(0.8, 1.2 - (newNodes.length * 0.02));
            
            reactFlowInstance.setCenter(
              selectedNodeForExpansion.position.x, 
              selectedNodeForExpansion.position.y, 
              { 
                duration: 800, 
                zoom: zoomLevel 
              }
            );
          }, 600);
        }
      })
      .catch(err => {
        console.error('Error handling node expansion:', err);
        setError('Failed to load verse relationships');
      })
      .finally(() => {
        // Remove loading indicator
        setLoadingVerses(prev => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
      });
  }, [selectedNodeForExpansion, expandedNodes, flowNodes, flowEdges, reactFlowInstance, calculateOptimalLayout, expandedEdgeStyle, setLoadingVerses]);

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
      
      // Apply book filter consistently for all cases
      const matchesBook = selectedBook 
        ? node.data.book === selectedBook 
        : true
      
      // Only show nodes that match both search and book filter
      const matchesFilters = matchesSearch && matchesBook
      
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
        
        // Check if this is the focused verse (last focused verse)
        const isFocused = node.id === lastFocusedVerseId;
        
        // Update node style based on connection, expansion status, and focus status
        return {
          ...node,
          hidden: !(isConnected || isExpanded) || !matchesFilters,
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
            // Add highlight styles for focused node
            boxShadow: isFocused ? '0 0 15px rgba(59, 130, 246, 0.7)' : node.style?.boxShadow,
            zIndex: isFocused ? 1000 : node.style?.zIndex || 'auto',
          },
        }
      }
      
      // No verse selected, just apply the combined filters
      return {
        ...node,
        hidden: !matchesFilters,
        style: {
          ...node.style,
          opacity: 1,
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.1)',
          background: getNodeColor(node.data.book),
        },
      }
    })
  }, [flowNodes, searchTerm, selectedBook, selectedVerse, flowEdges, expandedNodes, lastFocusedVerseId])

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
            markerEnd: {
              type: MarkerType.Arrow,
              width: 10,
              height: 10,
              color: theme.colors.primary[500]
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
            markerEnd: {
              type: MarkerType.Arrow,
              width: 10,
              height: 10,
              color: '#db9004'
            },
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
          markerEnd: {
            ...defaultEdgeOptions.markerEnd,
            color: isConnected ? theme.colors.gray[400] : theme.colors.gray[400],
            opacity: isConnected ? 1 : 0.1,
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
          markerEnd: {
            type: MarkerType.Arrow,
            width: 10,
            height: 10,
            color: theme.colors.primary[500]
          },
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
      return false
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
        return false
      }

      // Create new nodes and edges from the data
      const newNodes: BibleNode[] = []
      const newEdges: Edge[] = []
      const existingNodeIds = new Set(flowNodes.map(n => n.id))
      
      // Track if we found the specific verse we're looking for
      let foundTargetVerse = false

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
          
          // Check if this is the verse we're looking for
          if (sourceNodeId === verseId) {
            foundTargetVerse = true
          }
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
          
          // Check if this is the verse we're looking for
          if (targetNodeId === verseId) {
            foundTargetVerse = true
          }
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

      // If we didn't find the target verse but we're specifically looking for it,
      // try adding it as a standalone node
      if (!foundTargetVerse && verseId.includes(`${book}-${chapter}-${verse}`)) {
        const baseX = (chapter * 250) % 2000
        const baseY = Math.floor(chapter / 8) * 200
        
        const standaloneNode: BibleNode = {
          id: verseId,
          type: 'default',
          position: { 
            x: baseX + (verse * 50),
            y: baseY + (verse * 30)
          },
          data: {
            label: `${book} ${chapter}:${verse}`,
            book: book,
            chapter: chapter,
            verse: verse,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          style: {
            ...nodeStyle,
            background: getNodeColor(book),
            // Add a distinct style for standalone nodes
            borderStyle: 'dashed',
            borderColor: theme.colors.primary[500],
          },
        }
        
        newNodes.push(standaloneNode)
        foundTargetVerse = true
        console.log(`Added standalone node for target verse: ${verseId}`);
      }

      // Batch update state
      if (newNodes.length > 0 || newEdges.length > 0) {
        // Use a promise to ensure state updates complete before returning
        await new Promise<void>(resolve => {
          setFlowNodes(nodes => {
            const updatedNodes = [...nodes, ...newNodes];
            setTimeout(() => resolve(), 0); // Use setTimeout to ensure state updates
            return updatedNodes;
          });
          
          setFlowEdges(edges => [...edges, ...newEdges]);
          
          // Update books list with new unique books
          const newBooks = Array.from(
            new Set([
              ...books,
              ...data.map(item => item.source_book),
              ...data.map(item => item.target_book),
            ])
          ).sort();
          setBooks(newBooks);
        });

        console.log(`Added ${newNodes.length} nodes and ${newEdges.length} edges for ${pageKey}`);
      }

      // Mark this page as loaded
      loadedPagesRef.current.add(pageKey);
      
      // Return whether we found the target verse
      return foundTargetVerse;

    } catch (error) {
      console.error('Error fetching additional graph data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      return false;
    } finally {
      setLoadingVerses(prev => {
        const next = new Set(prev);
        next.delete(verseId);
        return next;
      });
    }
  }, [flowNodes, flowEdges, books, loadingVerses, getNodeColor]);

  // Track when user manually navigates the graph
  const handleViewportChange = useCallback(() => {
    setUserHasNavigated(true);
  }, []);

  // Separate function to apply highlighting animation to a node
  const applyNodeHighlight = useCallback((nodeId: string) => {
    // First phase - apply highlight effect
    setFlowNodes(nodes => 
      nodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            style: {
              ...n.style,
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)',
              transform: 'scale(1.05)',
              zIndex: 1000,
              transition: 'all 0.3s ease'
            }
          };
        }
        return n;
      })
    );
    
    // Second phase - reset after animation
    setTimeout(() => {
      setFlowNodes(nodes => 
        nodes.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              style: {
                ...n.style,
                boxShadow: n.style?.boxShadow,
                transform: 'scale(1)',
                zIndex: 10,
                transition: 'all 0.5s ease'
              }
            };
          }
          return n;
        })
      );
    }, 1000);
  }, [setFlowNodes]);

  // Add a new function to handle focusing on a verse node
  const focusOnSelectedVerse = useCallback((verseId: string) => {
    // Find the node corresponding to the verse
    const node = flowNodes.find(n => n.id === verseId);
    
    if (node && reactFlowInstance && verseId !== lastFocusedVerseId) {
      // Always force focus on the selected verse with a slightly zoomed in view
      reactFlowInstance.setCenter(
        node.position.x, 
        node.position.y, 
        { 
          duration: 800,
          zoom: 1.2 // Slightly zoom in for better visibility
        }
      );
      
      // Remember we've focused on this verse
      setLastFocusedVerseId(verseId);
      
      console.log(`Focused on verse: ${verseId}`);
      return true;
    } else if (!node) {
      console.log(`Could not find node for verse: ${verseId}`);
      return false;
    }
    return false;
  }, [flowNodes, reactFlowInstance, lastFocusedVerseId, setLastFocusedVerseId]);

  // Implement a more robust verse loading system that handles retries
  const loadVerseWithRetries = useCallback(async (book: string, chapter: number, verse: number, maxRetries = 2) => {
    const verseId = `${book}-${chapter}-${verse}`;
    console.log(`Attempting to load verse: ${verseId}`);
    
    // First check if the verse already exists
    if (verseExistsInGraph(book, chapter, verse)) {
      return focusOnSelectedVerse(verseId);
    }
    
    // If not, try to load it with retries
    let retries = 0;
    let success = false;
    
    while (retries < maxRetries && !success) {
      // Try broader searches if we're retrying
      const searchBook = book;
      const searchChapter = chapter;
      const searchVerse = retries === 0 ? verse : 1; // On retry, search for the whole chapter
      
      console.log(`Loading attempt ${retries + 1} for ${searchBook}-${searchChapter}-${searchVerse}`);
      
      // Load the data - if we found our target verse, mark as success
      const found = await loadAdditionalData(searchBook, searchChapter, searchVerse);
      
      if (found) {
        // Try to focus on it now
        success = focusOnSelectedVerse(verseId);
        if (success) break;
      }
      
      // Slight delay before retry to allow React to update state
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    // Try once more to focus in case the node was added but not yet available when we checked
    if (!success && verseExistsInGraph(book, chapter, verse)) {
      success = focusOnSelectedVerse(verseId);
    }
    
    // Make a direct API call for the specific verse if all else fails
    if (!success) {
      try {
        console.log(`Making direct verse API call for ${verseId}`);
        const response = await fetch(
          `http://localhost:8000/verses/${book}/${chapter}/${verse}`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // If we got data but still no node, create one manually
          if (!verseExistsInGraph(book, chapter, verse)) {
            const baseX = (chapter * 250) % 2000;
            const baseY = Math.floor(chapter / 8) * 200;
            
            const standaloneNode: BibleNode = {
              id: verseId,
              type: 'default',
              position: { 
                x: baseX + (verse * 50),
                y: baseY + (verse * 30)
              },
              data: {
                label: `${book} ${chapter}:${verse}`,
                book: book,
                chapter: chapter,
                verse: verse,
              },
              sourcePosition: Position.Right,
              targetPosition: Position.Left,
              style: {
                ...nodeStyle,
                background: getNodeColor(book),
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: theme.colors.primary[500],
              },
            };
            
            // Add the node to the graph
            setFlowNodes(nodes => [...nodes, standaloneNode]);
            console.log(`Manually added standalone node for: ${verseId}`);
            
            // Wait a bit for state update
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Try to focus again
            success = focusOnSelectedVerse(verseId);
          }
        }
      } catch (err) {
        console.error(`Failed to make direct verse API call for ${verseId}:`, err);
      }
    }
    
    return success;
  }, [verseExistsInGraph, loadAdditionalData, focusOnSelectedVerse, getNodeColor]);

  // Update the useEffect to use our new more robust loading system
  useEffect(() => {
    if (!selectedVerse || !isInitialized) return;

    const { book, chapter, verse } = selectedVerse;
    const verseId = `${book}-${chapter}-${verse}`;
    
    // Prevent repeat focusing on the same verse
    if (verseId === lastFocusedVerseId) {
      return;
    }
    
    // Reset user navigation when verse is selected externally
    setUserHasNavigated(false);
    
    // Use our new robust loading system
    loadVerseWithRetries(book, chapter, verse);
    
  }, [selectedVerse, isInitialized, lastFocusedVerseId, loadVerseWithRetries]);

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
              {selectedNodeForExpansion && (
                <button
                  onClick={expandSelectedNode}
                  className="mt-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  {expandedNodes.has(`${selectedNodeForExpansion.data.book}-${selectedNodeForExpansion.data.chapter}-${selectedNodeForExpansion.data.verse}`) 
                    ? 'Collapse Node Connections' 
                    : 'Expand Node Connections'}
                </button>
              )}
              <button
                onClick={() => {
                  setActiveVerse(null);
                  setSelectedNodeForExpansion(null);
                }}
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