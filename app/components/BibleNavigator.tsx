'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import { Card } from './ui/Card'
import { Select } from './ui/Select'
import { BIBLE_STRUCTURE } from '../lib/bible-structure'

interface BibleNavigatorProps {
  onVerseSelect: (book: string, chapter: number, verse: number) => void
  initialBook?: string
  initialChapter?: number
  initialVerse?: number
}

export function BibleNavigator({ 
  onVerseSelect,
  initialBook = BIBLE_STRUCTURE[0].name,
  initialChapter = 1,
  initialVerse = 1
}: BibleNavigatorProps) {
  const [selectedBook, setSelectedBook] = useState<string>(initialBook)
  const [selectedChapter, setSelectedChapter] = useState<number>(initialChapter)
  const [selectedVerse, setSelectedVerse] = useState<number>(initialVerse)
  const [verseCount, setVerseCount] = useState<number>(0)

  const currentBook = BIBLE_STRUCTURE.find(book => book.name === selectedBook)

  // Update verse count when book or chapter changes
  useEffect(() => {
    if (currentBook) {
      setVerseCount(currentBook.verses[selectedChapter] || 0)
    }
  }, [currentBook, selectedChapter])

  // Only notify parent of selection changes when user explicitly changes a value
  const handleBookChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newBook = e.target.value
    setSelectedBook(newBook)
    setSelectedChapter(1)
    setSelectedVerse(1)
    onVerseSelect(newBook, 1, 1)
  }

  const handleChapterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const chapter = parseInt(e.target.value)
    setSelectedChapter(chapter)
    setSelectedVerse(1)
    onVerseSelect(selectedBook, chapter, 1)
  }

  const handleVerseChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const verse = parseInt(e.target.value)
    setSelectedVerse(verse)
    onVerseSelect(selectedBook, selectedChapter, verse)
  }

  return (
    <Card className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Book
        </label>
        <Select
          value={selectedBook}
          onChange={handleBookChange}
        >
          {BIBLE_STRUCTURE.map((book) => (
            <option key={book.name} value={book.name}>
              {book.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Chapter
        </label>
        <Select
          value={selectedChapter}
          onChange={handleChapterChange}
        >
          {currentBook?.chapters.map((chapter) => (
            <option key={chapter} value={chapter}>
              {chapter}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Verse
        </label>
        <Select
          value={selectedVerse}
          onChange={handleVerseChange}
        >
          {Array.from({ length: verseCount }, (_, i) => i + 1).map((verse) => (
            <option key={verse} value={verse}>
              {verse}
            </option>
          ))}
        </Select>
      </div>
    </Card>
  )
} 