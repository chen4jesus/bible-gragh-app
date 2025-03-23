'use client';

import { useState, useCallback } from 'react';
import { BibleGraph } from '../components/BibleGraph';
import { BibleNavigator } from '../components/BibleNavigator';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable';
import { useTranslations } from 'next-intl';

export default function LocalizedHomePage() {
  const t = useTranslations();
  
  const [currentVerse, setCurrentVerse] = useState({
    book: '创世记',
    chapter: 1,
    verse: 1,
  });

  const handleVerseSelect = useCallback((book: string, chapter: number, verse: number) => {
    setCurrentVerse({ book, chapter, verse });
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden bg-gray-50">
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
  );
} 