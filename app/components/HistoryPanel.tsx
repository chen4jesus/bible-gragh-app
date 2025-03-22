import { useState } from 'react'
import { ReadingHistory, BibleBookmark } from '../hooks/useBibleReader'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { theme } from '../styles/theme'

interface HistoryPanelProps {
  history: ReadingHistory[]
  bookmarks: BibleBookmark[]
  onSelectVerse: (verseId: string) => void
  onRemoveBookmark: (id: string) => void
}

export function HistoryPanel({
  history,
  bookmarks,
  onSelectVerse,
  onRemoveBookmark,
}: HistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'bookmarks'>('history')

  return (
    <Card variant="elevated" padding="none" className="w-80">
      <div className="flex border-b">
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'border-b-2 border-primary-500 text-primary-600 bg-primary-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('history')}
        >
          Reading History
        </button>
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'bookmarks'
              ? 'border-b-2 border-primary-500 text-primary-600 bg-primary-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('bookmarks')}
        >
          Bookmarks
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'history' ? (
          <div className="space-y-2">
            {history.map((item, index) => (
              <button
                key={index}
                onClick={() => onSelectVerse(item.verseId)}
                className="w-full text-left p-3 rounded-md bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">{item.verseId}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </button>
            ))}
            {history.length === 0 && (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No reading history yet</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="group relative p-3 rounded-md bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <button
                  onClick={() => onSelectVerse(bookmark.verseId)}
                  className="w-full text-left"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {bookmark.verseId}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{bookmark.label}</div>
                </button>
                <button
                  onClick={() => onRemoveBookmark(bookmark.id)}
                  className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
            {bookmarks.length === 0 && (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No bookmarks yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
} 