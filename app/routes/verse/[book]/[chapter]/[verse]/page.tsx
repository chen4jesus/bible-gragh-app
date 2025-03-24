'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { bibleApi, VerseData } from '../../../../../api/bibleApi';
import { Card } from '../../../../../components/ui/Card';
import VerseKnowledgeCards from '../../../../../components/VerseKnowledgeCards';
import Link from 'next/link';
import { defaultLocale } from '../../../../../i18n/config';
import { useTranslations } from 'next-intl';

export default function VersePage() {
  const params = useParams();
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locale = (params?.locale as string) || defaultLocale;
  const t = useTranslations('verse');

  // Function to create localized paths
  const getLocalePath = (path: string) => {
    return path === '/' ? `/${locale}` : `/${locale}${path}`;
  };

  useEffect(() => {
    const fetchVerse = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (params.book && params.chapter && params.verse) {
          const book = decodeURIComponent(params.book as string);
          const chapter = parseInt(params.chapter as string);
          const verse = parseInt(params.verse as string);
          
          const data = await bibleApi.getVerse(book, chapter, verse);
          setVerse(data);
        } else {
          setError(t('errors.invalidReference'));
        }
      } catch (err: any) {
        console.error('Failed to fetch verse:', err);
        setError(t('errors.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchVerse();
  }, [params.book, params.chapter, params.verse, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!verse) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">{t('notFound')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">
          {verse.book} {verse.chapter}:{verse.verse}
        </h1>
        <p className="text-lg mb-6">{verse.text}</p>
        
        <div className="flex gap-4 mb-6">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            onClick={() => window.history.back()}
          >
            {t('actions.back')}
          </button>
          <Link 
            href={getLocalePath(`/graph?verse=${verse.book}-${verse.chapter}-${verse.verse}`)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            {t('actions.viewInGraph')}
          </Link>
        </div>
      </Card>
      
      <VerseKnowledgeCards verse={verse} />
    </div>
  );
} 