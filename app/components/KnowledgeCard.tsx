'use client';

import { useState } from 'react';
import { KnowledgeCard as KnowledgeCardType } from '../api/bibleApi';
import { useAuth } from '../contexts/AuthContext';
import { bibleApi } from '../api/bibleApi';
import { FiEdit2, FiTrash2, FiSave, FiX } from 'react-icons/fi';

interface KnowledgeCardProps {
  card: KnowledgeCardType;
  onDelete?: () => void;
  onUpdate?: (updatedCard: KnowledgeCardType) => void;
}

export default function KnowledgeCard({ card, onDelete, onUpdate }: KnowledgeCardProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: card.title,
    content: card.content,
    tags: card.tags.join(', '),
    type: card.type,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = user?.id === card.user_id;
  
  const cardTypeColor = {
    note: 'border-blue-300 bg-blue-50',
    commentary: 'border-purple-300 bg-purple-50',
    reflection: 'border-yellow-300 bg-yellow-50',
    question: 'border-green-300 bg-green-50',
  }[card.type] || 'border-gray-300 bg-gray-50';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdate = async () => {
    if (!isOwner) return;

    setIsSaving(true);
    try {
      const updatedCard = await bibleApi.updateKnowledgeCard(card.id, {
        title: editData.title,
        content: editData.content,
        tags: editData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        type: editData.type as any,
      });

      if (onUpdate) {
        onUpdate(updatedCard);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update knowledge card:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;

    setIsDeleting(true);
    try {
      await bibleApi.deleteKnowledgeCard(card.id);
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Failed to delete knowledge card:', error);
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isEditing) {
    return (
      <div className={`border p-4 rounded-lg mb-4 shadow-sm ${cardTypeColor}`}>
        <div className="mb-3">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={editData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-3">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Content
          </label>
          <textarea
            id="content"
            name="content"
            value={editData.content}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-3">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            id="type"
            name="type"
            value={editData.type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="note">Note</option>
            <option value="commentary">Commentary</option>
            <option value="reflection">Reflection</option>
            <option value="question">Question</option>
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tags (comma separated)
          </label>
          <input
            id="tags"
            name="tags"
            type="text"
            value={editData.tags}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 flex items-center"
          >
            <FiX className="mr-1" /> Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={isSaving}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <FiSave className="mr-1" /> {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border p-4 rounded-lg mb-4 shadow-sm ${cardTypeColor}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-medium">{card.title}</h3>
        {isOwner && (
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-600 hover:text-blue-500"
              aria-label="Edit"
            >
              <FiEdit2 size={16} />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1 text-gray-600 hover:text-red-500"
              aria-label="Delete"
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="text-gray-700 mb-3 whitespace-pre-line">{card.content}</div>

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

      <div className="text-xs text-gray-500 flex justify-between">
        <span className="capitalize">{card.type}</span>
        <span>Updated: {formatDate(card.updated_at)}</span>
      </div>
    </div>
  );
} 