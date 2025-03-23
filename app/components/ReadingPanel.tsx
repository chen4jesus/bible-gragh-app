import { useState } from 'react'
import { BibleNote, BibleBookmark } from '../hooks/useBibleReader'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { theme } from '../styles/theme'
import { useTranslations } from 'next-intl'

interface ReadingPanelProps {
  verse: {
    book: string
    chapter: number
    verse: number
    text: string
  }
  notes: BibleNote[]
  isBookmarked: boolean
  onAddNote: (text: string) => void
  onUpdateNote: (id: string, text: string) => void
  onDeleteNote: (id: string) => void
  onToggleBookmark: () => void
  onClose: () => void
}

export function ReadingPanel({
  verse,
  notes,
  isBookmarked,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onToggleBookmark,
  onClose,
}: ReadingPanelProps) {
  const t = useTranslations()
  const [newNote, setNewNote] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim())
      setNewNote('')
    }
  }

  const handleEditNote = (note: BibleNote) => {
    setEditingNoteId(note.id)
    setEditingNoteText(note.text)
  }

  const handleSaveEdit = () => {
    if (editingNoteId && editingNoteText.trim()) {
      onUpdateNote(editingNoteId, editingNoteText.trim())
      setEditingNoteId(null)
      setEditingNoteText('')
    }
  }

  return (
    <Card className="p-4 min-h-full flex flex-col">
      <div className="flex justify-between items-center border-b pb-3 mb-4">
        <h2 className="text-xl font-semibold">{t('readingPanel.title')}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      {verse ? (
        <div className="flex-1">
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between mb-2">
              <h3 className="font-medium text-gray-700">
                {verse.book} {t('readingPanel.chapter', { number: verse.chapter })}
              </h3>
              <button
                onClick={onToggleBookmark}
                className={`text-xl ${isBookmarked ? 'text-yellow-500' : 'text-gray-300'}`}
                title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
              >
                ★
              </button>
            </div>
            <p className="text-lg mb-2">
              <span className="font-bold text-blue-600">{t('readingPanel.verse', { number: verse.verse })}</span> {verse.text}
            </p>
          </div>

          <div className="mt-6">
            <h3 className="font-medium text-gray-700 mb-2">Notes</h3>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto p-1">
              {notes.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No notes yet. Add one below!</p>
              ) : (
                notes.map(note => (
                  <div key={note.id} className="bg-gray-50 p-3 rounded-lg">
                    {editingNoteId === note.id ? (
                      <div>
                        <textarea
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          className="w-full p-2 border rounded-md mb-2 text-sm"
                          rows={3}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingNoteId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSaveEdit}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm mb-2">{note.text}</p>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{new Date(note.date).toLocaleDateString()}</span>
                          <div className="space-x-2">
                            <button
                              onClick={() => handleEditNote(note)}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDeleteNote(note.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="w-full p-3 border rounded-md text-sm"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  Add Note
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">{t('readingPanel.noSelection')}</p>
        </div>
      )}
    </Card>
  )
} 