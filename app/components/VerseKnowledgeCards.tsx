'use client';

import { useState, useEffect, useCallback } from 'react';
import { bibleApi, KnowledgeCard as KnowledgeCardType, VerseData } from '../api/bibleApi';
import KnowledgeCard from './KnowledgeCard';
import CreateKnowledgeCard from './CreateKnowledgeCard';
import { useAuth } from '../contexts/AuthContext';
import { useTranslations } from 'next-intl';

interface VerseKnowledgeCardsProps {
  book: string;
  chapter: number;
  verse: number;
  verseText?: string;
}

export default function VerseKnowledgeCards({ book, chapter, verse, verseText }: VerseKnowledgeCardsProps) {
  const [cards, setCards] = useState<KnowledgeCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();
  const t = useTranslations('knowledgeCards');

  const fetchCards = useCallback(async () => {
    // Skip fetching if not authenticated
    if (!isAuthenticated) {
      setLoading(false);
      setCards([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await bibleApi.getVerseKnowledgeCards(book, chapter, verse);
      setCards(data);
    } catch (err: any) {
      console.error('Failed to fetch knowledge cards:', err);
      setError(t('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [book, chapter, verse, t, isAuthenticated]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards, isAuthenticated]); // Re-fetch when auth state changes

  const handleCardDeleted = useCallback((cardId: string) => {
    // Optimistic update
    setCards(prevCards => prevCards.filter(card => card.id !== cardId));
  }, []);

  const handleCardUpdated = useCallback((updatedCard: KnowledgeCardType) => {
    // Optimistic update
    setCards(prevCards => 
      prevCards.map(card => card.id === updatedCard.id ? updatedCard : card)
    );
  }, []);

  const handleCardCreated = useCallback((newCard: KnowledgeCardType) => {
    setCards(prevCards => [newCard, ...prevCards]);
  }, []);

  const handleRetry = () => {
    fetchCards();
  };
  
  const handleLogin = () => {
    // Redirect to login page
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="py-4 text-center text-gray-600" aria-live="polite" role="status">
        <div className="inline-block animate-pulse rounded-full h-6 w-6 border-2 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent"></div>
        <p className="mt-2">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center" aria-live="assertive">
        <div className="bg-red-50 border border-red-100 rounded-md p-4">
          <p className="text-red-600 mb-2">{error}</p>
          <button 
            onClick={handleRetry}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">{t('title')}</h3>
        <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md">
          <p className="text-sm text-yellow-700 mb-2">{t('authRequired')}</p>
          <button
            onClick={handleLogin}
            className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors text-sm"
          >
            {t('loginToView')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">{t('title')}</h3>
      
      {cards.length === 0 ? (
        <p className="text-sm text-gray-600">{t('noCards')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {cards.map(card => (
            <KnowledgeCard 
              key={card.id}
              card={card}
              onDelete={handleCardDeleted}
              onUpdate={handleCardUpdated}
            />
          ))}
        </div>
      )}
      
      {isAuthenticated && (
        <div className="mt-6">
          <CreateKnowledgeCard 
            verseReference={{
              book,
              chapter,
              verse,
              text: verseText || ''
            }}
            onCardCreated={handleCardCreated}
          />
        </div>
      )}
    </div>
  );
} 