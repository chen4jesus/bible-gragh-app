'use client';

import { useState, useRef } from 'react';
import { KnowledgeCard as KnowledgeCardType } from '../api/bibleApi';
import { useAuth } from '../contexts/AuthContext';
import { bibleApi } from '../api/bibleApi';
import { FiEdit2, FiTrash2, FiSave, FiX, FiAlertCircle, FiMinimize2, FiMaximize2 } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

interface KnowledgeCardProps {
  card: KnowledgeCardType;
  onDelete: (cardId: string) => void;
  onUpdate: (updatedCard: KnowledgeCardType) => void;
}

export default function KnowledgeCard({ card, onDelete, onUpdate }: KnowledgeCardProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [originalHeight, setOriginalHeight] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState<string | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [editData, setEditData] = useState({
    title: card.title,
    content: card.content,
    tags: card.tags.join(', '),
    type: card.type,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('knowledgeCard');

  const isOwner = user?.id === card.user_id;
  
  const cardTypeColor = {
    note: 'border-blue-300 bg-blue-50',
    commentary: 'border-purple-300 bg-purple-50',
    reflection: 'border-yellow-300 bg-yellow-50',
    question: 'border-green-300 bg-green-50',
  }[card.type] || 'border-gray-300 bg-gray-50';
  
  const handleMinimize = () => {
    if (!isMinimized && cardRef.current) {
      // Save current dimensions before minimizing
      setOriginalHeight(cardRef.current.style.height);
      setOriginalWidth(cardRef.current.style.width);
    }
    setIsMinimized(!isMinimized);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdate = async () => {
    if (!isOwner) return;

    setError(null);
    setIsSaving(true);
    try {
      const updatedCard = await bibleApi.updateKnowledgeCard(card.id, {
        title: editData.title,
        content: editData.content,
        tags: editData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        type: editData.type as any,
      });

      onUpdate(updatedCard);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to update knowledge card:', err);
      setError(err.message || t('errors.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;

    setError(null);
    setIsDeleting(true);
    try {
      await bibleApi.deleteKnowledgeCard(card.id);
      onDelete(card.id);
    } catch (err: any) {
      console.error('Failed to delete knowledge card:', err);
      setError(err.message || t('errors.deleteFailed'));
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const handleCancel = () => {
    setEditData({
      title: card.title,
      content: card.content,
      tags: card.tags.join(', '),
      type: card.type,
    });
    setError(null);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div 
        className={`border p-4 rounded-lg mb-4 shadow-sm ${cardTypeColor} resize overflow-auto min-h-[120px] min-w-[250px]`} 
        style={{ resize: 'both' }}
        aria-label={t('editingCard')}
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md flex items-start" role="alert">
            <FiAlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <div className="mb-3">
          <label htmlFor={`title-${card.id}`} className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.title')}
          </label>
          <input
            id={`title-${card.id}`}
            name="title"
            type="text"
            value={editData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-required="true"
          />
        </div>

        <div className="mb-3">
          <label htmlFor={`content-${card.id}`} className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.content')}
          </label>
          <textarea
            id={`content-${card.id}`}
            name="content"
            value={editData.content}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-required="true"
          />
        </div>

        <div className="mb-3">
          <label htmlFor={`type-${card.id}`} className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.type')}
          </label>
          <select
            id={`type-${card.id}`}
            name="type"
            value={editData.type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="note">{t('types.note')}</option>
            <option value="commentary">{t('types.commentary')}</option>
            <option value="reflection">{t('types.reflection')}</option>
            <option value="question">{t('types.question')}</option>
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor={`tags-${card.id}`} className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.tags')}
          </label>
          <input
            id={`tags-${card.id}`}
            name="tags"
            type="text"
            value={editData.tags}
            onChange={handleChange}
            placeholder={t('fields.tagsPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 flex items-center"
            aria-label={t('actions.cancel')}
          >
            <FiX className="mr-1" /> {t('actions.cancel')}
          </button>
          <button
            onClick={handleUpdate}
            disabled={isSaving}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
            aria-busy={isSaving}
            aria-label={isSaving ? t('actions.saving') : t('actions.save')}
          >
            <FiSave className="mr-1" /> {isSaving ? t('actions.saving') : t('actions.save')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <article 
      ref={cardRef}
      className={`border p-4 rounded-lg mb-4 shadow-sm ${cardTypeColor} ${isMinimized ? '' : 'resize overflow-auto'} min-w-[250px] transition-all duration-300`}
      style={{ 
        resize: isMinimized ? 'none' : 'both',
        height: isMinimized ? '50px' : originalHeight || '',
        overflow: isMinimized ? 'hidden' : 'auto',
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-medium">{card.title}</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleMinimize}
            className="p-1 text-gray-600 hover:text-blue-500"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <FiMaximize2 size={16} /> : <FiMinimize2 size={16} />}
          </button>
          {isOwner && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-600 hover:text-blue-500"
                aria-label={t('actions.edit')}
              >
                <FiEdit2 size={16} />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1 text-gray-600 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t('actions.delete')}
                aria-busy={isDeleting}
              >
                <FiTrash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded-md flex items-start" role="alert">
              <FiAlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <div className="text-gray-700 mb-3 whitespace-pre-line">{card.content}</div>

          {card.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {card.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-block bg-gray-200 rounded-full px-2 py-1 text-xs text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-500 flex justify-between mt-2">
            <span className="capitalize">{t(`types.${card.type}`)}</span>
            <span>{t('updated')}: {formatDate(card.updated_at)}</span>
          </div>
        </>
      )}
    </article>
  );
}