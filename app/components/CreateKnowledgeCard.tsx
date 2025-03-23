'use client';

import { useState } from 'react';
import { bibleApi, VerseData } from '../api/bibleApi';
import { useAuth } from '../contexts/AuthContext';

interface CreateKnowledgeCardProps {
  verse: VerseData;
  onCardCreated: () => void;
}

export default function CreateKnowledgeCard({ verse, onCardCreated }: CreateKnowledgeCardProps) {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
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
      
      await bibleApi.createKnowledgeCard({
        title: formData.title,
        content: formData.content,
        tags,
        type: formData.type,
        verse_reference: {
          book: verse.book,
          chapter: verse.chapter,
          verse: verse.verse,
          text: verse.text,
        },
      });

      // Reset form and close
      setFormData({
        title: '',
        content: '',
        tags: '',
        type: 'note',
      });
      setIsOpen(false);
      onCardCreated();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create knowledge card. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 flex items-center"
      >
        <span className="mr-2">+</span> Add Note for {verse.book} {verse.chapter}:{verse.verse}
      </button>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <h3 className="text-lg font-medium mb-4">Add Note for {verse.book} {verse.chapter}:{verse.verse}</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="mb-3">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Content *
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="mb-3">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
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
            value={formData.tags}
            onChange={handleChange}
            placeholder="theology, prophecy, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Creating...' : 'Create Note'}
          </button>
        </div>
      </form>
    </div>
  );
} 