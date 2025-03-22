import { useState } from 'react'
import { BibleNote, BibleBookmark } from '../hooks/useBibleReader'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { theme } from '../styles/theme'

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
    <Card variant="elevated" padding="lg" className="max-w-2xl w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {verse.book} {verse.chapter}:{verse.verse}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Reading Mode</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleBookmark}
            className={`${
              isBookmarked ? 'text-yellow-500' : 'text-gray-400'
            } hover:text-yellow-600`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill={isBookmarked ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
          </Button>
        </div>
      </div>

      <div className="prose prose-lg max-w-none mb-8">
        <p className="text-gray-900 leading-relaxed">{verse.text}</p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <div className="space-y-4">
            {notes.map((note) => (
              <Card
                key={note.id}
                variant="outlined"
                padding="md"
                className="transition-all duration-200 hover:border-gray-400"
              >
                {editingNoteId === note.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editingNoteText}
                      onChange={(e) => setEditingNoteText(e.target.value)}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingNoteId(null)}
                      >
                        Cancel
                      </Button>
                      <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-700 whitespace-pre-wrap">{note.text}</p>
                    <div className="flex justify-end gap-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditNote(note)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDeleteNote(note.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
            <Card variant="outlined" padding="md">
              <div className="space-y-3">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button variant="primary" onClick={handleAddNote}>
                    Add Note
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Card>
  )
} 