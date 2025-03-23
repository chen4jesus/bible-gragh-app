'use client'

import { useState, useCallback } from 'react'
import { BibleGraph } from '../components/BibleGraph'
import { BibleNavigator } from '../components/BibleNavigator'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function Home() {
  const t = useTranslations()
  const { locale } = useParams() as { locale: string }
  const otherLocale = locale === 'en' ? 'zh' : 'en'
  
  const [currentVerse, setCurrentVerse] = useState({
    book: '创世记',
    chapter: 1,
    verse: 1,
  })

  const handleVerseSelect = useCallback((book: string, chapter: number, verse: number) => {
    setCurrentVerse({ book, chapter, verse })
  }, [])

  return (
    <main className="h-screen w-screen overflow-hidden bg-gray-50">
      <div className="absolute top-2 right-4 z-10">
        <Link href={`/${otherLocale}`} className="text-sm text-blue-600 hover:text-blue-800">
          {otherLocale === 'en' ? 'English' : '中文'}
        </Link>
      </div>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full w-full"
      >
        {/* Left Panel - Bible Navigator */}
        <ResizablePanel
          defaultSize={50}
          minSize={20}
          maxSize={50}
          className="bg-white"
        >
          <div className="h-full p-4">
            <h2 className="text-lg font-semibold mb-4">{t('home.title')}</h2>
            <BibleNavigator
              initialBook={currentVerse.book}
              initialChapter={currentVerse.chapter}
              initialVerse={currentVerse.verse}
              onVerseSelect={handleVerseSelect}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle className="bg-gray-200 w-1" />

        {/* Right Panel - Graph View */}
        <ResizablePanel
          defaultSize={75}
          className="bg-white"
        >
          <BibleGraph selectedVerse={currentVerse} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  )
} 