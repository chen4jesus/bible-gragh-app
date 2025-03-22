import { useState, useCallback, useEffect } from 'react'
import { CustomNodeData } from '../components/BibleGraph'

export interface BibleNote {
  id: string
  verseId: string
  text: string
  createdAt: Date
}

export interface ReadingHistory {
  verseId: string
  timestamp: Date
}

export interface BibleBookmark {
  id: string
  verseId: string
  label: string
  createdAt: Date
}

interface Note {
  id: string
  text: string
  createdAt: string
}

interface Bookmark {
  id: string
  description: string
  createdAt: string
}

interface ReadingHistoryItem {
  verseId: string
  timestamp: string
}

interface CustomNode extends CustomNodeData {
  id: string
  position: { x: number, y: number }
}

export function useBibleReader() {
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>([])
  const [bookmarks, setBookmarks] = useState<Record<string, Bookmark>>({})
  const [notes, setNotes] = useState<Record<string, Note[]>>({})
  const [customNodes, setCustomNodes] = useState<Record<string, CustomNode>>({})
  const [currentVerseId, setCurrentVerseId] = useState<string | null>(null)

  // Load data from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('readingHistory')
    const savedBookmarks = localStorage.getItem('bookmarks')
    const savedNotes = localStorage.getItem('notes')
    const savedCustomNodes = localStorage.getItem('customNodes')

    if (savedHistory) setReadingHistory(JSON.parse(savedHistory))
    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks))
    if (savedNotes) setNotes(JSON.parse(savedNotes))
    if (savedCustomNodes) setCustomNodes(JSON.parse(savedCustomNodes))
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('readingHistory', JSON.stringify(readingHistory))
  }, [readingHistory])

  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
  }, [bookmarks])

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    localStorage.setItem('customNodes', JSON.stringify(customNodes))
  }, [customNodes])

  const addToHistory = useCallback((verseId: string) => {
    setReadingHistory((prev) => [
      { verseId, timestamp: new Date() },
      ...prev.slice(0, 99), // Keep last 100 entries
    ])
  }, [])

  const addBookmark = useCallback((verseId: string, label: string) => {
    const bookmark: BibleBookmark = {
      id: Math.random().toString(36).substring(7),
      verseId,
      label,
      createdAt: new Date(),
    }
    setBookmarks((prev) => ({ ...prev, [bookmark.id]: bookmark }))
  }, [])

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const newBookmarks = { ...prev }
      delete newBookmarks[id]
      return newBookmarks
    })
  }, [])

  const addNote = useCallback((verseId: string, text: string) => {
    const note: BibleNote = {
      id: Math.random().toString(36).substring(7),
      verseId,
      text,
      createdAt: new Date(),
    }
    setNotes((prev) => ({ ...prev, [verseId]: [...(prev[verseId] || []), note] }))
  }, [])

  const updateNote = useCallback((id: string, text: string) => {
    setNotes((prev) => ({
      ...prev,
      [id]: prev[id].map((note) => (note.id === id ? { ...note, text } : note))
    }))
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => ({
      ...prev,
      [id]: prev[id].filter((note) => note.id !== id)
    }))
  }, [])

  const setCurrentVerse = useCallback((verseId: string) => {
    setCurrentVerseId(verseId)
    addToHistory(verseId)
  }, [addToHistory])

  const getVerseNotes = useCallback((verseId: string) => {
    return notes[verseId] || []
  }, [notes])

  const isBookmarked = useCallback((verseId: string) => {
    return Object.values(bookmarks).some((b) => b.verseId === verseId)
  }, [bookmarks])

  const addCustomNode = useCallback((nodeData: CustomNodeData, position: { x: number, y: number }) => {
    const id = `custom-${Date.now()}`
    setCustomNodes((prev) => ({
      ...prev,
      [id]: {
        ...nodeData,
        id,
        position,
      },
    }))
    return id
  }, [])

  const updateCustomNode = useCallback((id: string, nodeData: Partial<CustomNodeData>) => {
    setCustomNodes((prev) => {
      if (!prev[id]) return prev
      return {
        ...prev,
        [id]: {
          ...prev[id],
          ...nodeData,
        },
      }
    })
  }, [])

  const updateCustomNodePosition = useCallback((id: string, position: { x: number, y: number }) => {
    setCustomNodes((prev) => {
      if (!prev[id]) return prev
      return {
        ...prev,
        [id]: {
          ...prev[id],
          position,
        },
      }
    })
  }, [])

  const deleteCustomNode = useCallback((id: string) => {
    setCustomNodes((prev) => {
      const newNodes = { ...prev }
      delete newNodes[id]
      return newNodes
    })
  }, [])

  const getCustomNodes = useCallback(() => {
    return Object.values(customNodes)
  }, [customNodes])

  return {
    readingHistory,
    bookmarks,
    notes,
    customNodes: getCustomNodes(),
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
  }
} 