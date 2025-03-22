import { XMLParser } from 'fast-xml-parser'

// Import the XML file directly
import bibleXml from '../../data/Bible_Chinese_CUVS.xml'

// Type definitions for Bible data structure
export interface BibleVerse {
  book: string
  chapter: number
  verse: number
  text: string
}

export interface BibleChapter {
  number: number
  verses: BibleVerse[]
}

export interface BibleBook {
  name: string
  chapters: BibleChapter[]
}

export interface BibleData {
  books: BibleBook[]
}

export function loadBibleData(): BibleData {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
    })
    
    const result = parser.parse(bibleXml)
    const bibleData: BibleData = { books: [] }

    // Parse the XML structure based on your Bible_Chinese_CUVS.xml format
    const books = result.bible.book
    bibleData.books = books.map((book: any) => {
      const chapters = Array.isArray(book.chapter) ? book.chapter : [book.chapter]
      return {
        name: book.name,
        chapters: chapters.map((chapter: any) => {
          const verses = Array.isArray(chapter.verse) ? chapter.verse : [chapter.verse]
          return {
            number: parseInt(chapter.number),
            verses: verses.map((verse: any) => ({
              book: book.name,
              chapter: parseInt(chapter.number),
              verse: parseInt(verse.number),
              text: verse.text
            }))
          }
        })
      }
    })

    return bibleData
  } catch (error) {
    console.error('Error parsing Bible data:', error)
    throw error
  }
} 