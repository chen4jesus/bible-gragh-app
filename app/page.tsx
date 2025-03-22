'use client'

import { useState, useCallback } from 'react'
import { BibleGraph } from './components/BibleGraph'
import { BibleNavigator } from './components/BibleNavigator'
import { BIBLE_STRUCTURE } from './lib/bible-structure'

export default function Home() {
  const [currentVerse, setCurrentVerse] = useState<{
    book: string
    chapter: number
    verse: number
  }>({
    book: BIBLE_STRUCTURE[0].name,
    chapter: 1,
    verse: 1
  })

  const handleVerseSelect = useCallback((book: string, chapter: number, verse: number) => {
    setCurrentVerse({ book, chapter, verse })
  }, [])

  return (
    <main className="flex min-h-screen">
      {/* Left side - Bible Navigator */}
      <div className="w-1/4 p-4 border-r">
        <BibleNavigator
          onVerseSelect={handleVerseSelect}
          initialBook={currentVerse.book}
          initialChapter={currentVerse.chapter}
          initialVerse={currentVerse.verse}
        />
      </div>

      {/* Right side - Graph */}
      <div className="flex-1">
        <BibleGraph selectedVerse={currentVerse} />
      </div>
    </main>
  )
} 