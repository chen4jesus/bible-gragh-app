'use client';

import { useState, useEffect } from 'react';
import { bibleApi, KnowledgeCard as KnowledgeCardType, VerseData } from '../api/bibleApi';
import KnowledgeCard from './KnowledgeCard';
import CreateKnowledgeCard from './CreateKnowledgeCard';
import { useAuth } from '../contexts/AuthContext';

interface VerseKnowledgeCardsProps {
  verse: VerseData;
}

export default function VerseKnowledgeCards({ verse }: VerseKnowledgeCardsProps) {
  const [cards, setCards] = useState<KnowledgeCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bibleApi.getVerseKnowledgeCards(verse.book, verse.chapter, verse.verse);
      setCards(data);
    } catch (err: any) {
      console.error('Failed to fetch knowledge cards:', err);
      setError('Failed to load knowledge cards. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [verse.book, verse.chapter, verse.verse]);

  const handleCardDeleted = (cardId: string) => {
    setCards(cards.filter(card => card.id !== cardId));
  };

  const handleCardUpdated = (updatedCard: KnowledgeCardType) => {
    setCards(cards.map(card => 
      card.id === updatedCard.id ? updatedCard : card
    ));
  };

  if (loading) {
    return <div className="py-4 text-center text-gray-600">Loading notes...</div>;
  }

  if (error) {
    return <div className="py-4 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="mt-4">
      <h3 className="text-xl font-semibold mb-4">Notes for {verse.book} {verse.chapter}:{verse.verse}</h3>
      
      {isAuthenticated && (
        <CreateKnowledgeCard 
          verse={verse} 
          onCardCreated={fetchCards} 
        />
      )}
      
      {cards.length === 0 ? (
        <div className="py-4 text-center text-gray-600">
          {isAuthenticated 
            ? 'No notes yet. Be the first to add a note!' 
            : 'No notes found for this verse.'}
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map(card => (
            <KnowledgeCard
              key={card.id}
              card={card}
              onDelete={() => handleCardDeleted(card.id)}
              onUpdate={handleCardUpdated}
            />
          ))}
        </div>
      )}
      
      {!isAuthenticated && cards.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Want to add your own notes? <a href="/login" className="text-blue-600 hover:underline">Log in</a> or <a href="/register" className="text-blue-600 hover:underline">create an account</a>.</p>
        </div>
      )}
    </div>
  );
} 