'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bibleApi, KnowledgeCard } from '../../api/bibleApi';
import { Card } from '../../components/ui/Card';
import KnowledgeCardComponent from '../../components/KnowledgeCard';
import { useAuth } from '../../contexts/AuthContext';
import { useParams } from 'next/navigation';
import { defaultLocale } from '../../i18n/config';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function KnowledgeCardsPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const params = useParams();
  const locale = (params?.locale as string) || defaultLocale;
  const t = useTranslations('knowledgeCards');

  // Function to create localized paths
  const getLocalePath = (path: string) => {
    return path === '/' ? `/${locale}` : `/${locale}${path}`;
  };

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated && !loading) {
      router.push(getLocalePath('/login') + '?redirect=' + getLocalePath('/knowledge-cards'));
    }
  }, [isAuthenticated, loading, router, getLocalePath]);

  useEffect(() => {
    const fetchCards = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // If user is authenticated, fetch their cards
        const filters: Record<string, any> = {};
        
        if (user?.id) {
          filters.user_id = user.id;
        }
        
        if (filter !== 'all') {
          filters.type = filter;
        }
        
        if (searchTerm) {
          filters.search = searchTerm;
        }
        
        const data = await bibleApi.getKnowledgeCards(filters);
        setCards(data);
      } catch (err: any) {
        console.error('Failed to fetch knowledge cards:', err);
        setError(t('errors.fetchFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [isAuthenticated, user?.id, filter, searchTerm, t]);

  const handleCardDeleted = (cardId: string) => {
    setCards(cards.filter(card => card.id !== cardId));
  };

  const handleCardUpdated = (updatedCard: KnowledgeCard) => {
    setCards(cards.map(card => 
      card.id === updatedCard.id ? updatedCard : card
    ));
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">{t('authRequired')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('filters.allTypes')}</option>
            <option value="note">{t('filters.notes')}</option>
            <option value="commentary">{t('filters.commentary')}</option>
            <option value="reflection">{t('filters.reflection')}</option>
            <option value="question">{t('filters.questions')}</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">{t('noCards')}</p>
          <p className="mt-2">
            {t('startExploring')}
          </p>
          <Link 
            href={getLocalePath('/graph')}
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            {t('goToBibleGraph')}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {cards.map(card => (
            <div key={card.id} className="border-b pb-6">
              <div className="mb-2">
                <Link 
                  href={getLocalePath(`/verse/${encodeURIComponent(card.verse_reference.book)}/${card.verse_reference.chapter}/${card.verse_reference.verse}`)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {card.verse_reference.book} {card.verse_reference.chapter}:{card.verse_reference.verse}
                </Link>
              </div>
              
              <KnowledgeCardComponent
                card={card}
                onDelete={() => handleCardDeleted(card.id)}
                onUpdate={handleCardUpdated}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 