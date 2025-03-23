'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bibleApi, KnowledgeCard } from '../../api/bibleApi';
import { Card } from '../../components/ui/Card';
import KnowledgeCardComponent from '../../components/KnowledgeCard';
import { useAuth } from '../../contexts/AuthContext';

export default function KnowledgeCardsPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated && !loading) {
      router.push('/login?redirect=/knowledge-cards');
    }
  }, [isAuthenticated, loading, router]);

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
        setError('Failed to load your knowledge cards. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [isAuthenticated, user?.id, filter, searchTerm]);

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
        <p className="text-gray-600">Please log in to view your knowledge cards...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">My Knowledge Cards</h1>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search in your notes..."
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
            <option value="all">All Types</option>
            <option value="note">Notes</option>
            <option value="commentary">Commentary</option>
            <option value="reflection">Reflection</option>
            <option value="question">Questions</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading your knowledge cards...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">You haven't created any knowledge cards yet.</p>
          <p className="mt-2">
            Start by exploring verses in the Bible Graph and adding notes to verses!
          </p>
          <a 
            href="/graph"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Go to Bible Graph
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {cards.map(card => (
            <div key={card.id} className="border-b pb-6">
              <div className="mb-2">
                <a 
                  href={`/verse/${encodeURIComponent(card.verse_reference.book)}/${card.verse_reference.chapter}/${card.verse_reference.verse}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {card.verse_reference.book} {card.verse_reference.chapter}:{card.verse_reference.verse}
                </a>
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