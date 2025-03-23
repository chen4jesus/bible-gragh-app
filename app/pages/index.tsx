'use client';

import { useState, useCallback } from 'react';
import { BibleGraph } from '../components/BibleGraph';
import { BibleNavigator } from '../components/BibleNavigator';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable';
import { useTranslation } from '../utils/i18n';
import Link from 'next/link';

export default function Home() {
  const { t, locale, changeLanguage } = useTranslation();
  const otherLocale = locale === 'en' ? 'zh' : 'en';
  
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
      <div className="px-4 py-2 border-b flex justify-between items-center">
        <h1 className="text-xl font-semibold">{t('home.title')}</h1>
        <button 
          onClick={() => changeLanguage(otherLocale)}
          className="px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm"
        >
          {locale === 'en' ? '切换到中文' : 'Switch to English'}
        </button>
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