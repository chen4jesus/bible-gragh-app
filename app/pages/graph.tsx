'use client';

import { useState, useCallback } from 'react';
import { BibleGraph } from '../components/BibleGraph';
import { BibleNavigator } from '../components/BibleNavigator';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable';
import { useTranslation } from '../utils/i18n';

export default function GraphPage() {
  const { t } = useTranslation();
  
  const [currentVerse, setCurrentVerse] = useState({
    book: '创世记',
    chapter: 1,
    verse: 1,
  });

  const handleVerseSelect = useCallback((book: string, chapter: number, verse: number) => {
    setCurrentVerse({ book, chapter, verse });
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="px-4 py-2 border-b">
        <h1 className="text-xl font-semibold">{t('graph.overview')}</h1>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} minSize={20}>
            <BibleNavigator 
              onVerseSelect={handleVerseSelect} 
              initialBook={currentVerse.book}
              initialChapter={currentVerse.chapter}
              initialVerse={currentVerse.verse}
            />
          </ResizablePanel>
          
          <ResizableHandle />
          
          <ResizablePanel defaultSize={75}>
            <BibleGraph selectedVerse={currentVerse} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
} 