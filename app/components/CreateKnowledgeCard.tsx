'use client';

import { useState } from 'react';
import { bibleApi, KnowledgeCard, VerseData } from '../api/bibleApi';
import { useAuth } from '../contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { FiAlertCircle, FiX, FiPlus } from 'react-icons/fi';

interface VerseReference {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

interface CreateKnowledgeCardProps {
  verseReference: VerseReference;
  onCardCreated: (card: KnowledgeCard) => void;
}

export default function CreateKnowledgeCard({ verseReference, onCardCreated }: CreateKnowledgeCardProps) {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    type: 'note',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('createKnowledgeCard');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      tags: '',
      type: 'note',
    });
    setError(null);
  };

  const handleCancel = () => {
    resetForm();
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Convert tags to array
      const tags = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];
      
      const newCard = await bibleApi.createKnowledgeCard({
        title: formData.title,
        content: formData.content,
        tags,
        type: formData.type,
        verse_reference: {
          book: verseReference.book,
          chapter: verseReference.chapter,
          verse: verseReference.verse,
          text: verseReference.text
        }
      });
      
      // Reset form and close it
      resetForm();
      setIsOpen(false);
      
      // Notify parent
      onCardCreated(newCard);
    } catch (err: any) {
      console.error('Failed to create knowledge card:', err);
      setError(err.message || t('errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="mt-4">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center justify-center"
          aria-label={t('addCard')}
        >
          <FiPlus className="mr-2" />
          {t('addCard')}
        </button>
      ) : (
        <div className="border border-gray-300 rounded-md p-4 bg-white shadow-sm" aria-labelledby="create-card-title">
          <h4 id="create-card-title" className="text-lg font-medium mb-4">{t('title')}</h4>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md flex items-start" role="alert">
              <FiAlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} aria-label={t('title')}>
            <div className="space-y-4">
              <div>
                <label htmlFor="create-title" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.title')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="create-title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  aria-required="true"
                  placeholder={t('placeholders.title')}
                />
              </div>
              
              <div>
                <label htmlFor="create-type" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.type')}
                </label>
                <select
                  id="create-type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="note">{t('types.note')}</option>
                  <option value="commentary">{t('types.commentary')}</option>
                  <option value="reflection">{t('types.reflection')}</option>
                  <option value="question">{t('types.question')}</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="create-content" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.content')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="create-content"
                  name="content"
                  rows={4}
                  value={formData.content}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  aria-required="true"
                  placeholder={t('placeholders.content')}
                />
              </div>
              
              <div>
                <label htmlFor="create-tags" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.tags')}
                </label>
                <input
                  type="text"
                  id="create-tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder={t('placeholders.tags')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">{t('tagsHelp')}</p>
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center"
                  aria-label={t('actions.cancel')}
                >
                  <FiX className="mr-1" />
                  {t('actions.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={loading}
                  aria-busy={loading}
                  aria-label={loading ? t('actions.saving') : t('actions.save')}
                >
                  {loading ? t('actions.saving') : t('actions.save')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 