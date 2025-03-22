'use client'

import { useEffect, useState, useCallback } from 'react'
import { BibleData } from '../lib/bible-loader'
import { bibleData } from '../data/bible-data'

interface BibleNavigatorProps {
  initialBook: string
  initialChapter: number
  initialVerse: number
  onVerseSelect: (book: string, chapter: number, verse: number) => void
}

export function BibleNavigator({
  initialBook,
  initialChapter,
  initialVerse,
  onVerseSelect
}: BibleNavigatorProps) {
  const [selectedBook, setSelectedBook] = useState(initialBook)
  const [selectedChapter, setSelectedChapter] = useState(initialChapter)
  const [selectedVerse, setSelectedVerse] = useState(initialVerse)
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Find current book and chapter
  const currentBook = bibleData.books.find(b => b.name === selectedBook)
  const currentChapter = currentBook?.chapters.find(c => c.number == selectedChapter)

  // Function to fetch graph data for a verse
  const fetchGraphData = useCallback(async (book: string, chapter: number, verse: number) => {
    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:8000/verses/${book}/${chapter}/${verse}`)
      if (!response.ok) {
        throw new Error('Failed to fetch verse connections')
      }
      // The graph will update automatically through the selectedVerse prop
    } catch (error) {
      console.error('Error fetching verse connections:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Function to scroll to and highlight a verse
  const focusVerse = useCallback(async (verseNumber: number) => {
    setSelectedVerse(verseNumber)
    setHighlightedVerse(verseNumber)

    // Scroll the verse into view
    const verseElement = document.getElementById(`verse-${verseNumber}`)
    if (verseElement) {
      // First scroll the container to ensure the verse is visible
      const container = document.querySelector('.scrollbar-thin')
      if (container) {
        container.scrollTop = 0 // Reset scroll position first
      }

      // Then scroll to the verse with a slight delay to ensure smooth animation
      setTimeout(() => {
        verseElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center'
        })
        
        // Add extra focus effect
        verseElement.classList.add('ring-4', 'ring-yellow-200', 'ring-opacity-50')
        
        // Remove focus effect after animation
        setTimeout(() => {
          verseElement.classList.remove('ring-4', 'ring-yellow-200', 'ring-opacity-50')
        }, 2000)
      }, 100)
    }

    // Remove highlight after delay
    const timer = setTimeout(() => {
      setHighlightedVerse(null)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  // Initialize with first available values if current selections are invalid
  useEffect(() => {
    if (!currentBook && bibleData.books.length > 0) {
      const firstBook = bibleData.books[0]
      setSelectedBook(firstBook.name)
      if (firstBook.chapters.length > 0) {
        setSelectedChapter(firstBook.chapters[0].number)
        if (firstBook.chapters[0].verses.length > 0) {
          const firstVerse = firstBook.chapters[0].verses[0].verse
          setSelectedVerse(firstVerse)
          onVerseSelect(firstBook.name, firstBook.chapters[0].number, firstVerse)
          fetchGraphData(firstBook.name, firstBook.chapters[0].number, firstVerse)
        }
      }
    }
  }, [])

  // Handle selection changes
  const handleBookChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newBook = event.target.value
    const book = bibleData.books.find(b => b.name === newBook)
    if (book) {
      setSelectedBook(newBook)
      // Reset to first chapter of new book
      const firstChapter = book.chapters[0]
      setSelectedChapter(firstChapter.number)
      // Reset to first verse of first chapter
      const firstVerse = firstChapter.verses[0].verse
      setSelectedVerse(firstVerse)
      onVerseSelect(newBook, firstChapter.number, firstVerse)
      await fetchGraphData(newBook, firstChapter.number, firstVerse)
      focusVerse(firstVerse)
    }
  }

  const handleChapterChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newChapterNum = parseInt(event.target.value, 10)
    if (currentBook) {
      const newChapter = currentBook.chapters.find(c => c.number == newChapterNum)
      if (newChapter) {
        // Update chapter selection
        setSelectedChapter(newChapterNum)
        // Reset to first verse of new chapter
        const firstVerse = newChapter.verses[0].verse
        setSelectedVerse(firstVerse)
        // Notify parent component and update graph
        onVerseSelect(selectedBook, newChapterNum, firstVerse)
        await fetchGraphData(selectedBook, newChapterNum, firstVerse)
        // Focus the first verse with a small delay to ensure state updates
        setTimeout(() => {
          focusVerse(firstVerse)
        }, 100)
      }
    }
  }

  const handleVerseChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newVerse = parseInt(event.target.value, 10)
    setSelectedVerse(newVerse)
    onVerseSelect(selectedBook, selectedChapter, newVerse)
    await fetchGraphData(selectedBook, selectedChapter, newVerse)
    focusVerse(newVerse)
  }

  // Handle verse click
  const handleVerseClick = async (verse: number) => {
    setSelectedVerse(verse)
    onVerseSelect(selectedBook, selectedChapter, verse)
    await fetchGraphData(selectedBook, selectedChapter, verse)
    focusVerse(verse)
  }

  // Effect to ensure verse exists in current chapter
  useEffect(() => {
    if (currentChapter) {
      const verseExists = currentChapter.verses.some(v => v.verse === selectedVerse)
      if (!verseExists) {
        const firstVerse = currentChapter.verses[0].verse
        setSelectedVerse(firstVerse)
        onVerseSelect(selectedBook, selectedChapter, firstVerse)
        fetchGraphData(selectedBook, selectedChapter, firstVerse)
        focusVerse(firstVerse)
      }
    }
  }, [currentChapter, selectedChapter])

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          {/* Book Selection */}
          <div className="col-span-3 sm:col-span-1">
            <label htmlFor="book" className="block text-sm font-medium text-gray-600 mb-1">
              书卷
            </label>
            <select
              id="book"
              value={selectedBook}
              onChange={handleBookChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={isLoading}
            >
              {bibleData.books.map(book => (
                <option key={book.name} value={book.name}>
                  {book.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Selection */}
          <div className="col-span-3 sm:col-span-1">
            <label htmlFor="chapter" className="block text-sm font-medium text-gray-600 mb-1">
              章
            </label>
            <select
              id="chapter"
              value={selectedChapter}
              onChange={handleChapterChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={isLoading}
            >
              {currentBook?.chapters.map(chapter => (
                <option key={chapter.number} value={chapter.number}>
                  第{chapter.number}章
                </option>
              ))}
            </select>
          </div>

          {/* Verse Selection */}
          <div className="col-span-3 sm:col-span-1">
            <label htmlFor="verse" className="block text-sm font-medium text-gray-600 mb-1">
              节
            </label>
            <select
              id="verse"
              value={selectedVerse}
              onChange={handleVerseChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={isLoading}
            >
              {currentChapter?.verses.map(verse => (
                <option key={verse.verse} value={verse.verse}>
                  第{verse.verse}节
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Display Verses */}
      <div className="flex-1 overflow-auto mt-6 scrollbar-thin">
        {currentChapter ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Chapter Title */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedBook} 第{selectedChapter}章
              </h3>
              <span className="text-sm text-gray-500">
                共 {currentChapter.verses.length} 节
              </span>
            </div>
            
            {/* All Verses in Chapter */}
            <div className="space-y-3">
              {currentChapter.verses.map(verse => (
                <div 
                  key={verse.verse}
                  id={`verse-${verse.verse}`}
                  onClick={() => handleVerseClick(verse.verse)}
                  className={`group p-4 rounded-lg transition-all duration-500 cursor-pointer ${
                    isLoading ? 'opacity-50 pointer-events-none' : ''
                  } ${
                    verse.verse === selectedVerse 
                      ? 'bg-blue-50 border border-blue-100 shadow-sm' 
                      : verse.verse === highlightedVerse
                      ? 'bg-yellow-50 border border-yellow-100 shadow-sm animate-pulse'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      verse.verse === selectedVerse
                        ? 'bg-blue-100 text-blue-700'
                        : verse.verse === highlightedVerse
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    }`}>
                      {verse.verse}
                    </span>
                    <span className={`flex-1 text-lg leading-relaxed ${
                      verse.verse === selectedVerse || verse.verse === highlightedVerse
                        ? 'text-gray-900'
                        : 'text-gray-700'
                    }`}>
                      {verse.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">请选择章节</div>
        )}
      </div>
    </div>
  )
} 