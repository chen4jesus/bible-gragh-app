import { useState } from 'react'
import { ReadingHistory, BibleBookmark } from '../hooks/useBibleReader'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { theme } from '../styles/theme'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations()
  const [activeTab, setActiveTab] = useState<'history' | 'bookmarks'>('history')

  return (
    <Card className="h-full flex flex-col">
      <div className="border-b">
        <h2 className="text-xl font-semibold p-4">{t('historyPanel.title')}</h2>
        <div className="flex">
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('history')}
          >
            {t('historyPanel.title')}
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'bookmarks'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('bookmarks')}
          >
            Bookmarks
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'history' ? (
          <div>
            {history.length > 0 ? (
              <>
                <div className="flex justify-between mb-3">
                  <div className="text-sm text-gray-500">{history.length} items</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    {t('historyPanel.clearAll')}
                  </Button>
                </div>
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectVerse(item.id)}
                      className="p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="font-medium">
                        {item.book} {item.chapter}:{item.verse}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-center py-8">
                {t('historyPanel.noHistory')}
              </div>
            )}
          </div>
        ) : (
          <div>
            {bookmarks.length > 0 ? (
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="p-3 bg-gray-50 rounded-lg flex justify-between items-start"
                  >
                    <div 
                      className="cursor-pointer" 
                      onClick={() => onSelectVerse(bookmark.verseId)}
                    >
                      <div className="font-medium">
                        {bookmark.book} {bookmark.chapter}:{bookmark.verse}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(bookmark.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveBookmark(bookmark.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                No bookmarks yet
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
} 