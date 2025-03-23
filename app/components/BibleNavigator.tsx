'use client'

import { useEffect, useState, useCallback } from 'react'
import { BibleData } from '../lib/bible-loader'
import { bibleData } from '../data/bible-data'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { bibleApi } from '../api/bibleApi'

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
  const t = useTranslations()
  const { locale } = useParams() as { locale: string }
  
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
      await bibleApi.getVerse(book, chapter, verse)
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
      // Directly scroll to the verse element without resetting position first
      // Using block: 'nearest' to minimize scroll distance when verse is already close to viewport
      verseElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest'
      })
      
      // Add extra focus effect
      verseElement.classList.add('ring-4', 'ring-yellow-200', 'ring-opacity-50')
      
      // Remove focus effect after animation
      setTimeout(() => {
        verseElement.classList.remove('ring-4', 'ring-yellow-200', 'ring-opacity-50')
      }, 2000)
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
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="book-select" className="block text-sm font-medium text-gray-700 mb-1">
            {t('navigation.selectBook')}
          </label>
          <select
            id="book-select"
            value={selectedBook}
            onChange={handleBookChange}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            {bibleData.books.map((book) => (
              <option key={book.name} value={book.name}>
                {book.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="chapter-select" className="block text-sm font-medium text-gray-700 mb-1">
            {t('navigation.selectChapter')}
          </label>
          <select
            id="chapter-select"
            value={selectedChapter}
            onChange={handleChapterChange}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            {currentBook?.chapters.map((chapter) => (
              <option key={chapter.number} value={chapter.number}>
                {chapter.number}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="verse-select" className="block text-sm font-medium text-gray-700 mb-1">
          {t('navigation.selectVerse')}
        </label>
        <select
          id="verse-select"
          value={selectedVerse}
          onChange={handleVerseChange}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
        >
          {currentChapter?.verses.map((verse) => (
            <option key={verse.verse} value={verse.verse}>
              {verse.verse}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-auto flex-grow scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {currentChapter?.verses.map((verse) => (
          <div
            key={verse.verse}
            id={`verse-${verse.verse}`}
            onClick={() => handleVerseClick(verse.verse)}
            className={`p-2 mb-2 rounded cursor-pointer hover:bg-blue-50 transition-colors ${
              verse.verse === selectedVerse ? 'bg-blue-100' : ''
            } ${verse.verse === highlightedVerse ? 'animate-pulse bg-yellow-100' : ''}`}
          >
            <span className="font-bold text-blue-700 mr-2">{verse.verse}</span>
            <span>{verse.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
} 