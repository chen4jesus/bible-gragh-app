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
  NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { theme } from '../styles/theme'
import { useTranslations } from 'next-intl'
import { 
  bibleApi, 
  GraphData as ApiGraphData, 
  VerseData, 
  CrossReferenceData,
  KnowledgeGraphData,
  GraphNode as ApiGraphNode,
  GraphEdge as ApiGraphEdge,
  KnowledgeCard
} from '../api/bibleApi'
import VerseKnowledgeCards from './VerseKnowledgeCards'

type GraphData = ApiGraphData;

interface BibleNodeData extends Record<string, unknown> {
  label: string
  book: string
  chapter: number
  verse: number
  type?: 'verse' | 'knowledge_card'
  cardId?: string
  cardType?: string
  content?: string
  tags?: string[]
  userId?: string
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

export interface CustomNodeData {
  label: string
  type: 'note' | 'commentary' | 'reflection'
  content: string
  createdAt: string
}

function createUniqueEdgeId(source: string, target: string): string {
  // Sort the IDs to ensure consistent edge IDs regardless of direction
  const [first, second] = [source, target].sort()
  return `edge-${first}-${second}`
}

// Then add a custom node component for knowledge cards
const KnowledgeCardNode = ({ data }: { data: BibleNodeData }) => {
  const cardTypeColors = {
    note: theme.colors.blue[400],
    commentary: theme.colors.purple[400],
    reflection: theme.colors.green[400],
    default: theme.colors.gray[400]
  };

  const getCardColor = (cardType: string = 'default') => {
    return cardTypeColors[cardType as keyof typeof cardTypeColors] || cardTypeColors.default;
  };

  return (
    <div 
      className="px-4 py-3 rounded-lg border shadow-md"
      style={{ 
        background: 'white',
        borderColor: getCardColor(data.cardType),
        borderWidth: '2px',
        minWidth: '200px',
        maxWidth: '250px'
      }}
    >
      <div className="flex items-center mb-2">
        <div 
          className="w-3 h-3 rounded-full mr-2" 
          style={{ backgroundColor: getCardColor(data.cardType) }}
        />
        <div className="text-xs text-gray-500 uppercase tracking-wider">{data.cardType}</div>
      </div>
      <h3 className="font-semibold text-sm truncate" title={data.label}>{data.label}</h3>
      {data.content && (
        <p className="text-xs text-gray-600 mt-1 line-clamp-2" title={data.content as string}>
          {data.content}
        </p>
      )}
      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {(data.tags as string[]).slice(0, 3).map((tag, index) => (
            <span 
              key={index} 
              className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600"
            >
              {tag}
            </span>
          ))}
          {(data.tags as string[]).length > 3 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              +{(data.tags as string[]).length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Add the nodeTypes object
const nodeTypes: NodeTypes = {
  knowledgeCard: KnowledgeCardNode
};

function BibleGraphContent({ selectedVerse }: BibleGraphProps) {
  const t = useTranslations()
  
  // Internal state for React Flow
  const [flowNodes, setFlowNodes] = useState<Node<BibleNodeData>[]>([])
  const [flowEdges, setFlowEdges] = useState<Edge[]>([])
  
  // Application state
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeVerse, setActiveVerse] = useState<VerseData | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBook, setSelectedBook] = useState<string | null>(null)
  const [books, setBooks] = useState<string[]>([])
  
  // Track the last focused verse to prevent unnecessary re-focusing
  const [lastFocusedVerseId, setLastFocusedVerseId] = useState<string | null>(null)
  // Track if user has manually navigated the graph
  const [userHasNavigated, setUserHasNavigated] = useState(false)
  // Track initial data load
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)

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
  
  // Add layout options
  type LayoutType = 'default' | 'circular' | 'force' | 'tree' | 'grid' | 'radial'
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('default')

  // Add state to track if we had NaN errors
  const [hasFixedNaN, setHasFixedNaN] = useState(false)
  
  // Add a new state to track currently selected node for expansion
  const [selectedNodeForExpansion, setSelectedNodeForExpansion] = useState<BibleNode | null>(null);
  
  // Add new state for controlling knowledge card visibility
  const [showKnowledgeCards, setShowKnowledgeCards] = useState(true);
  
  // Function to load verse data when a selection is made
  const loadVerseData = async (book: string, chapter: number, verse: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const verseId = `${book}-${chapter}-${verse}`;
      
      // Fetch the filtered graph data for this verse
      const data = await bibleApi.getFilteredGraphData(book, chapter, verse, 20);
      
      if (data.length === 0) {
        console.log('No connections found for this verse');
        
        // Create a single node for this verse even if it has no connections
        const newNode: BibleNode = {
          id: verseId,
          type: 'default',
          position: { x: 0, y: 0 }, // Center of the viewport
          data: {
            label: `${book} ${chapter}:${verse}`,
            book,
            chapter,
            verse,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          style: {
            ...nodeStyle,
            background: getNodeColor(book),
          },
        };
        
        setFlowNodes([newNode]);
        setFlowEdges([]);
        focusOnNode(verseId);
        return;
      }
      
      // Process the data to create nodes and edges
      const newNodes: BibleNode[] = [];
      const newEdges: Edge[] = [];
      const nodeMap = new Map<string, BibleNode>();
      
      // Extract unique books for future use
      const uniqueBooks = Array.from(
        new Set([
          ...data.map((item) => item.source_book),
          ...data.map((item) => item.target_book),
        ])
      ).sort();
      setBooks(uniqueBooks);
      
      data.forEach((item, index) => {
        // Create source node
        const sourceId = `${item.source_book}-${item.source_chapter}-${item.source_verse}`;
        if (!nodeMap.has(sourceId)) {
          const node: BibleNode = {
            id: sourceId,
            type: 'default',
            position: { 
              x: 0 + Math.cos(index * 0.5) * 200, 
              y: 0 + Math.sin(index * 0.5) * 200 
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
          };
          nodeMap.set(sourceId, node);
          newNodes.push(node);
        }

        // Create target node
        const targetId = `${item.target_book}-${item.target_chapter}-${item.target_verse}`;
        if (!nodeMap.has(targetId)) {
          const node: BibleNode = {
            id: targetId,
            type: 'default',
            position: { 
              x: 0 + Math.cos((index + 5) * 0.5) * 200, 
              y: 0 + Math.sin((index + 5) * 0.5) * 200 
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
          };
          nodeMap.set(targetId, node);
          newNodes.push(node);
        }

        // Create edge with consistent styling and unique ID
        const edgeId = createUniqueEdgeId(sourceId, targetId);
        if (!newEdges.some(e => e.id === edgeId)) {
          newEdges.push({
            id: edgeId,
            source: sourceId,
            target: targetId,
            ...defaultEdgeOptions,
          });
        }
      });
      
      setFlowNodes(newNodes);
      setFlowEdges(newEdges);
      focusOnNode(verseId);
    } catch (error) {
      console.error('Error loading verse data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Function to focus on a specific node
  const focusOnNode = useCallback((nodeId: string) => {
    console.log('Focusing on node:', nodeId);
    const node = flowNodes.find(n => n.id === nodeId);
    if (node && reactFlowInstance) {
      console.log('Node found, centering view:', node.position);
      // Center the view on this node
      reactFlowInstance.setCenter(node.position.x, node.position.y, { duration: 800 });
      // Update the last focused node
      setLastFocusedVerseId(nodeId);
    } else {
      console.log('Node not found or reactFlowInstance not ready');
    }
  }, [flowNodes, reactFlowInstance, setLastFocusedVerseId]);

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
      
      const data = await bibleApi.getVerse(book, chapter, verse)
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
    
    // Get data from the selected node
    const { book, chapter, verse } = selectedNodeForExpansion.data;
    const nodeId = `${book}-${chapter}-${verse}`;
    
    // Check if node is already expanded - if it is, collapse it
    const expandedNodesArray = Array.from(expandedNodes);
    if (expandedNodes.has(nodeId)) {
      // Remove this node ID from expanded nodes
      expandedNodes.delete(nodeId);
      setExpandedNodes(new Set(expandedNodesArray.filter(id => id !== nodeId)));
      
      // Remove all edges that are connected to this node and marked as expansion edges
      setFlowEdges(edges => edges.filter(edge => 
        !(edge.source === nodeId && edge.data?.isExpansionEdge)
      ));
      
      // Nothing else to do for collapsing
      return;
    }
    
    // Fetch related verses from the API
    bibleApi.getCrossReferences(book, chapter, verse)
      .then((relationships: CrossReferenceData[]) => {
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
      .catch(error => {
        console.error('Error expanding node:', error);
        setError('Failed to expand node connections');
      });
  }, [selectedNodeForExpansion, expandedNodes, flowNodes, flowEdges, reactFlowInstance, calculateOptimalLayout, expandedEdgeStyle, setFlowEdges]);

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
      
      const data = await bibleApi.getFilteredGraphData(book, chapter, verse, 100)
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
      console.error(`Error loading additional data for ${book} ${chapter}:${verse}:`, error)
      return false
    } finally {
      setLoadingVerses(prev => {
        const newSet = new Set(prev)
        newSet.delete(verseId)
        return newSet
      })
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
      // Make an API call to retrieve the verse and its connections
      const [book, chapter, verse] = verseId.split('-');
      loadAdditionalData(book, parseInt(chapter), parseInt(verse))
        .then(success => {
          if (success) {
            // Try focusing again after data is loaded
            focusOnSelectedVerse(verseId);
          }
        })
        .catch(err => {
          console.error(`Failed to load data for verse: ${verseId}`, err);
        });
      return false;
    }
    return false;
  }, [flowNodes, reactFlowInstance, lastFocusedVerseId, setLastFocusedVerseId]);

  // Implement a more robust verse loading system that handles retries
  const loadVerseWithRetries = useCallback(async (book: string, chapter: number, verse: number, maxRetries = 2) => {
    const verseId = `${book}-${chapter}-${verse}`;
    let retries = 0;
    let success = false;
    
    // First check if the verse already exists in the graph
    success = focusOnSelectedVerse(verseId);
    if (success) return true;

    // If not found, try to load additional data around this verse
    if (!success) {
      success = await loadAdditionalData(book, chapter, verse);
      if (success) {
        // Wait a bit for state updates
        await new Promise(resolve => setTimeout(resolve, 300));
        success = focusOnSelectedVerse(verseId);
      }
    }

    // Try loading related chapters if still not found
    while (!success && retries < maxRetries) {
      retries++;
      console.log(`Retry ${retries} for ${verseId}`);
      
      // Try to load previous and next chapters
      const prevChapter = chapter > 1 ? chapter - 1 : chapter;
      const nextChapter = chapter + 1;
      
      const prevSuccess = await loadAdditionalData(book, prevChapter, 1);
      const nextSuccess = await loadAdditionalData(book, nextChapter, 1);
      
      if (prevSuccess || nextSuccess) {
        // Wait a bit for state updates
        await new Promise(resolve => setTimeout(resolve, 300));
        success = focusOnSelectedVerse(verseId);
      }
    }
    
    // Make a direct API call for the specific verse if all else fails
    if (!success) {
      try {
        console.log(`Making direct verse API call for ${verseId}`);
        const data = await bibleApi.getVerse(book, chapter, verse);
        
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
      } catch (err) {
        console.error(`Failed to make direct verse API call for ${verseId}:`, err);
      }
    }
    
    return success;
  }, [loadAdditionalData, focusOnSelectedVerse, verseExistsInGraph]);

  // Update the useEffect to use our new more robust loading system
  useEffect(() => {
    console.log('selectedVerse effect running', selectedVerse);
    
    if (!selectedVerse || loading) return;

    const { book, chapter, verse } = selectedVerse;
    const verseId = `${book}-${chapter}-${verse}`;
    
    // Prevent repeat focusing on the same verse
    if (verseId === lastFocusedVerseId && !userHasNavigated) {
      console.log('Skipping focus, already focused on verse', verseId);
      return;
    }
    
    // Reset user navigation when verse is selected externally
    setUserHasNavigated(false);
    
    // Check if node already exists
    const existingNode = flowNodes.find(node => node.id === verseId);
    if (existingNode) {
      console.log('Found existing node, focusing on it', verseId);
      focusOnNode(verseId);
      return;
    }
    
    console.log('Loading new verse data for', verseId);
    // Use our loadVerseData function to load verse data
    loadVerseData(book, chapter, verse);
    
  }, [selectedVerse, lastFocusedVerseId, userHasNavigated, flowNodes, focusOnNode, loadVerseData, loading, setUserHasNavigated]);

  // Convert loadKnowledgeGraphData to use useCallback
  // Replace the existing loadKnowledgeGraphData function with this memoized version
  const loadKnowledgeGraphData = useCallback(async (book: string, chapter: number, verse: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const verseId = `${book}-${chapter}-${verse}`;
      
      // Fetch the knowledge graph data for this verse
      const graphData = await bibleApi.getKnowledgeGraph(book, chapter, verse, 2, 50);
      
      if (!graphData || (!graphData.nodes.length && !graphData.edges.length)) {
        console.log('No knowledge graph data found for this verse, falling back to verse data');
        // Fall back to the original verse data loading
        await loadVerseData(book, chapter, verse);
        return;
      }
      
      // Process the API graph data to React Flow format
      const newNodes: BibleNode[] = [];
      const newEdges: Edge[] = [];
      const nodeMap = new Map<string, BibleNode>();
      
      // Extract unique books for future use
      const uniqueBooks = Array.from(
        new Set(
          graphData.nodes
            .filter(node => node.type === 'verse' && node.book)
            .map(node => node.book as string)
        )
      ).sort();
      setBooks(uniqueBooks);
      
      // First pass - create all nodes
      graphData.nodes.forEach((apiNode, index) => {
        let nodeId = apiNode.id;
        let nodeType = 'default';
        let nodePosition = { 
          x: 0, 
          y: 0 
        };
        let nodeData: BibleNodeData;
        
        if (apiNode.type === 'verse') {
          nodeData = {
            label: `${apiNode.book} ${apiNode.chapter}:${apiNode.verse}`,
            book: apiNode.book as string,
            chapter: apiNode.chapter as number,
            verse: apiNode.verse as number,
            type: 'verse'
          };
          nodeType = 'default';
        } else {
          // Knowledge card node
          nodeData = {
            label: apiNode.title as string,
            book: apiNode.book as string,
            chapter: apiNode.chapter as number,
            verse: apiNode.verse as number,
            type: 'knowledge_card',
            cardId: apiNode.card_id,
            cardType: apiNode.card_type,
            content: apiNode.content,
            tags: apiNode.tags as string[],
            userId: apiNode.user_id
          };
          nodeType = 'knowledgeCard';
        }
        
        const node: BibleNode = {
          id: nodeId,
          type: nodeType,
          position: nodePosition,
          data: nodeData,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          style: nodeType === 'default' ? {
            ...nodeStyle,
            background: getNodeColor(apiNode.book as string),
          } : undefined,
        };
        
        nodeMap.set(nodeId, node);
        newNodes.push(node);
      });
      
      // Second pass - create all edges
      graphData.edges.forEach((apiEdge) => {
        const edgeId = apiEdge.id;
        
        // Only add edge if both source and target nodes exist
        if (nodeMap.has(apiEdge.source) && nodeMap.has(apiEdge.target)) {
          newEdges.push({
            id: edgeId,
            source: apiEdge.source,
            target: apiEdge.target,
            label: apiEdge.type,
            ...defaultEdgeOptions,
          });
        }
      });
      
      // Position the nodes in a radial layout
      const centerX = 0;
      const centerY = 0;
      const mainVerseNode = nodeMap.get(verseId);
      
      if (mainVerseNode) {
        // Position main verse at center
        mainVerseNode.position = { x: centerX, y: centerY };
        
        // Position other nodes in a radial pattern
        const verseNodes = newNodes.filter(node => node.data.type === 'verse' && node.id !== verseId);
        const knowledgeCardNodes = newNodes.filter(node => node.data.type === 'knowledge_card');
        
        // Position verse nodes in an inner circle
        const verseRadius = Math.max(250, verseNodes.length * 20);
        verseNodes.forEach((node, index) => {
          const angle = (2 * Math.PI * index) / verseNodes.length;
          node.position = {
            x: centerX + verseRadius * Math.cos(angle),
            y: centerY + verseRadius * Math.sin(angle),
          };
        });
        
        // Position knowledge card nodes in an outer circle
        if (knowledgeCardNodes.length > 0) {
          const cardRadius = verseRadius + 150;
          knowledgeCardNodes.forEach((node, index) => {
            const angle = (2 * Math.PI * index) / knowledgeCardNodes.length;
            node.position = {
              x: centerX + cardRadius * Math.cos(angle),
              y: centerY + cardRadius * Math.sin(angle),
            };
          });
        }
      }
      
      // Filter nodes/edges based on visibility toggle
      const filteredNodes = showKnowledgeCards 
        ? newNodes 
        : newNodes.filter(node => node.data.type !== 'knowledge_card');
      
      const filteredEdges = showKnowledgeCards 
        ? newEdges 
        : newEdges.filter(edge => {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            return !(
              (sourceNode && sourceNode.data.type === 'knowledge_card') ||
              (targetNode && targetNode.data.type === 'knowledge_card')
            );
          });
      
      setFlowNodes(filteredNodes);
      setFlowEdges(filteredEdges);
      focusOnNode(verseId);
    } catch (error) {
      console.error('Error loading knowledge graph data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred loading knowledge graph');
      // Fall back to regular verse data loading
      loadVerseData(book, chapter, verse);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, loadVerseData, focusOnNode, setBooks, setFlowNodes, setFlowEdges, showKnowledgeCards, getNodeColor]);

  // Restore the toggleKnowledgeCards function that was accidentally removed
  const toggleKnowledgeCards = useCallback(() => {
    setShowKnowledgeCards(prev => !prev);
    
    // Update nodes and edges visibility based on the toggle
    if (!showKnowledgeCards) {
      // If we're showing cards, reload with full data
      const activeNode = flowNodes.find(node => node.id === lastFocusedVerseId);
      if (activeNode) {
        loadKnowledgeGraphData(
          activeNode.data.book,
          activeNode.data.chapter,
          activeNode.data.verse
        );
      }
    } else {
      // If we're hiding cards, filter them out from current data
      setFlowNodes(prev => prev.filter(node => node.data.type !== 'knowledge_card'));
      setFlowEdges(prev => {
        const nodeIds = new Set(flowNodes.filter(n => n.data.type !== 'knowledge_card').map(n => n.id));
        return prev.filter(edge => 
          nodeIds.has(edge.source) && nodeIds.has(edge.target)
        );
      });
    }
  }, [showKnowledgeCards, flowNodes, lastFocusedVerseId, loadKnowledgeGraphData]);

  // Fix initialDataLoaded setting in initial load useEffect
  // Update the useEffect for initial data loading
  useEffect(() => {
    if (!initialDataLoaded && flowNodes.length === 0 && !loading) {
      setInitialDataLoaded(true); // Change from false to true to prevent multiple loads
      // Use the new method to load knowledge graph data instead
      loadKnowledgeGraphData('创世记', 1, 1);
    }
  }, [initialDataLoaded, flowNodes.length, loading, loadKnowledgeGraphData]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading verse connections...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>
  }

  return (
    <div className="h-full w-full flex flex-col">
      {error && (
        <div className="bg-red-100 text-red-700 p-2 text-sm rounded">{error}</div>
      )}
      
      <div className="flex-grow flex flex-col relative">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          selectionMode={selectionMode}
          deleteKeyCode={deleteKeyPressed ? 'Delete' : null}
          nodesDraggable={nodeDraggable}
          nodesConnectable={nodeConnectable}
          fitView
          minZoom={0.1}
          maxZoom={2}
        >
          <Background color="#ccc" gap={16} />
          <Controls />
          <MiniMap nodeColor={(node) => {
            const nodeData = node.data as BibleNodeData;
            return nodeData.type === 'knowledge_card' 
              ? theme.colors.primary[300] 
              : getNodeColor(nodeData.book);
          }} />
          
          <Panel position="top-left" className="bg-white p-2 rounded shadow-md">
            {/* Add a toggle control for knowledge cards */}
            <div className="flex items-center mb-2">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showKnowledgeCards}
                  onChange={toggleKnowledgeCards}
                  className="mr-2"
                />
                <span className="text-sm">{t('graph.showKnowledgeCards')}</span>
              </label>
            </div>
            
            {/* Existing controls */}
            <div className="flex flex-col gap-1">
              {/* Book filter */}
              <select
                value={selectedBook || ''}
                onChange={(e) => setSelectedBook(e.target.value || null)}
                className="p-1 text-sm border rounded"
              >
                <option value="">{t('navigation.allBooks')}</option>
                {books.map((book) => (
                  <option key={book} value={book}>
                    {book}
                  </option>
                ))}
              </select>
              
              {/* Search */}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('graph.searchPlaceholder')}
                className="p-1 text-sm border rounded"
              />
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {activeVerse && (
        <div className="p-4 border-t bg-gray-50 max-h-[30vh] overflow-auto">
          <h2 className="text-lg font-semibold mb-2">
            {activeVerse.book} {activeVerse.chapter}:{activeVerse.verse}
          </h2>
          <p className="text-gray-800">{activeVerse.text}</p>
          
          <VerseKnowledgeCards
            book={activeVerse.book}
            chapter={activeVerse.chapter}
            verse={activeVerse.verse}
            verseText={activeVerse.text}
          />
        </div>
      )}
    </div>
  );
}

export function BibleGraph({ selectedVerse }: BibleGraphProps) {
  return (
    <ReactFlowProvider>
      <BibleGraphContent selectedVerse={selectedVerse} />
    </ReactFlowProvider>
  )
} 