const fs = require('fs')
const path = require('path')
const { XMLParser } = require('fast-xml-parser')

// Define the Bible structure with verse counts
const BIBLE_STRUCTURE = {
  '创世记': [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26],
  '出埃及记': [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38],
  '利未记': [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34],
  '民数记': [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13],
  '申命记': [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12]
}

// Define paths
const dataDir = path.join(__dirname, '..', 'data')
const xmlPath = path.join(dataDir, 'Bible_Chinese_CUVS.xml')
const outputPath = path.join(__dirname, '..', 'app', 'data', 'bible-data.ts')

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Sample Bible structure (first few verses of Genesis)
const sampleBible = {
  bible: {
    book: [
      {
        name: '创世记',
        chapter: [
          {
            number: '1',
            verse: [
              { number: '1', text: '起初，神创造天地。' },
              { number: '2', text: '地是空虚混沌，渊面黑暗；神的灵运行在水面上。' },
              { number: '3', text: '神说："要有光"，就有了光。' }
            ]
          }
        ]
      }
    ]
  }
}

// Check if XML file exists, if not create a sample one
if (!fs.existsSync(xmlPath)) {
  console.log('XML file not found, creating a sample file...')
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<bible>
  <book name="创世记">
    <chapter number="1">
      <verse number="1">起初，神创造天地。</verse>
      <verse number="2">地是空虚混沌，渊面黑暗；神的灵运行在水面上。</verse>
      <verse number="3">神说："要有光"，就有了光。</verse>
    </chapter>
  </book>
</bible>`
  fs.writeFileSync(xmlPath, xmlContent, 'utf-8')
  console.log('Sample XML file created at:', xmlPath)
}

try {
  // Read and parse XML
  console.log('Reading XML file from:', xmlPath)
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8')
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseTagValue: true,
    trimValues: true,
    isArray: (name) => {
      return ['chapter', 'verse'].includes(name)
    }
  })
  
  const result = parser.parse(xmlContent)
  
  // Process the XML structure into our desired format
  const books = []
  
  // Handle different possible XML structures
  const xmlBooks = result.bible?.book || []
  if (!Array.isArray(xmlBooks)) {
    throw new Error('Could not find Bible books in XML structure. Available keys: ' + 
      Object.keys(result).join(', '))
  }
  
  // Process books in chunks to handle large data
  const processBooks = () => {
    xmlBooks.forEach(book => {
      const chapters = []
      const bookName = book.name
      
      // Handle different possible chapter structures
      const xmlChapters = book.chapter || []
      const chapterList = Array.isArray(xmlChapters) ? xmlChapters : [xmlChapters]
      
      chapterList.forEach((chapter) => {
        const verses = []
        
        // Handle different possible verse structures
        const xmlVerses = chapter.verse || []
        const verseList = Array.isArray(xmlVerses) ? xmlVerses : [xmlVerses]
        
        verseList.forEach((verse) => {
          verses.push({
            book: bookName,
            chapter: parseInt(chapter.number),
            verse: parseInt(verse.number),
            text: verse['#text']
          })
        })
        
        chapters.push({
          number: parseInt(chapter.number),
          verses: verses
        })
      })
      
      books.push({
        name: bookName,
        chapters: chapters
      })
    })
  }

  // Process all books
  processBooks()

  // Write the TypeScript file in chunks
  console.log('Writing TypeScript file...')
  
  // Start with the file header
  const header = `import { BibleData } from '../lib/bible-loader'

// This file is auto-generated. Do not edit manually.
export const bibleData: BibleData = {
  books: [\n`

  // Create app/data directory if it doesn't exist
  const appDataDir = path.dirname(outputPath)
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true })
  }

  // Write the file in chunks
  const writeStream = fs.createWriteStream(outputPath)
  writeStream.write(header)

  // Write each book
  books.forEach((book, bookIndex) => {
    const bookContent = JSON.stringify(book, null, 2)
      .split('\n')
      .map(line => '    ' + line) // Add extra indentation
      .join('\n')
      .replace(/"([^"]+)":/g, '$1:') // Convert JSON double quotes to TypeScript object syntax
      .replace(/"name":/g, 'name:')
      .replace(/"chapters":/g, 'chapters:')
      .replace(/"number":/g, 'number:')
      .replace(/"verses":/g, 'verses:')
      .replace(/"book":/g, 'book:')
      .replace(/"chapter":/g, 'chapter:')
      .replace(/"verse":/g, 'verse:')
      .replace(/"text":/g, 'text:')

    writeStream.write(bookContent)
    if (bookIndex < books.length - 1) {
      writeStream.write(',\n')
    }
  })

  // Write the file footer
  writeStream.write('\n  ]\n} as const;\n')
  writeStream.end()

  // Wait for the file to be written
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve)
    writeStream.on('error', reject)
  })

  console.log('\nBible data conversion completed! Output written to:', outputPath)

  // Log some stats to verify the conversion
  console.log('\nConversion Statistics:')
  console.log('Total books:', books.length)
  books.forEach(book => {
    console.log(`\n${book.name}:`)
    console.log('  Chapters:', book.chapters.length)
    console.log('  Total verses:', book.chapters.reduce((sum, ch) => sum + ch.verses.length, 0))
  })

} catch (error) {
  console.error('Error during conversion:', error)
  if (error.stack) {
    console.error('Stack trace:', error.stack)
  }
  process.exit(1)
} 