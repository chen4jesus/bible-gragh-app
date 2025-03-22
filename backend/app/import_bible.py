import xmltodict
from neo4j import GraphDatabase
import os
from dotenv import load_dotenv
from tqdm import tqdm
import sys
import json

load_dotenv()

# Neo4j connection
uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
user = os.getenv("NEO4J_USER", "neo4j")
password = os.getenv("NEO4J_PASSWORD", "password")

# Use environment variables for connection
driver = GraphDatabase.driver(uri, auth=(user, password))

def create_constraints(session):
    # Create constraints for unique verses
    session.run("""
        CREATE CONSTRAINT verse_id IF NOT EXISTS
        FOR (v:Verse) REQUIRE (v.book, v.chapter, v.verse) IS UNIQUE
    """)

def create_verse(session, book_name, book_number, chapter, verse, text):
    session.run("""
        MERGE (v:Verse {
            book: $book_name,
            book_number: $book_number,
            chapter: $chapter,
            verse: $verse,
            text: $text
        })
    """, book_name=book_name, book_number=book_number, chapter=chapter, verse=verse, text=text)

def create_cross_reference(session, source_book, source_chapter, source_verse,
                         target_book, target_chapter, target_verse):
    try:
        result = session.run("""
            MATCH (v1:Verse), (v2:Verse)
            WHERE v1.book = $source_book AND v1.chapter = $source_chapter AND v1.verse = $source_verse
            AND v2.book = $target_book AND v2.chapter = $target_chapter AND v2.verse = $target_verse
            MERGE (v1)-[r:REFERENCES]->(v2)
            RETURN count(r) as count
        """, source_book=source_book, source_chapter=source_chapter, source_verse=source_verse,
            target_book=target_book, target_chapter=target_chapter, target_verse=target_verse)
        count = result.single()["count"]
        print(f"Created cross-reference from {source_book} {source_chapter}:{source_verse} to {target_book} {target_chapter}:{target_verse}")
        return count
    except Exception as e:
        print(f"Error creating cross-reference: {str(e)}")
        return 0

def clean_text(text):
    """Clean verse text by removing extra whitespace and special characters"""
    if not text:
        return ""
    return " ".join(text.split())

def import_bible_data():
    # Get the absolute path to the XML file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    xml_path = os.path.join(project_root, "public", "bible", "Bible_Chinese_CUVS.xml")

    print(f"Looking for XML file at: {xml_path}")

    # Read the XML file
    try:
        with open(xml_path, "r", encoding="utf-8") as file:
            print("Reading XML file...")
            xml_content = file.read()
            print(f"File size: {len(xml_content)} bytes")
            print("Parsing XML content...")
            bible_data = xmltodict.parse(xml_content)
            print("XML parsing successful")
    except FileNotFoundError:
        print(f"Error: Could not find the XML file at {xml_path}")
        print("Please make sure the Bible_Chinese_CUVS.xml file exists in the public/bible directory")
        return
    except Exception as e:
        print(f"Error parsing XML file: {str(e)}")
        print("Please check if the XML file is well-formed")
        return

    # Verify the XML structure
    if "XMLBIBLE" not in bible_data:
        print("Error: XML file does not contain 'XMLBIBLE' root element")
        return

    if "BIBLEBOOK" not in bible_data["XMLBIBLE"]:
        print("Error: XML file does not contain any BIBLEBOOK elements")
        return

    # Create constraints
    try:
        with driver.session() as session:
            print("Creating database constraints...")
            create_constraints(session)
            print("Constraints created successfully")
    except Exception as e:
        print(f"Error creating constraints: {str(e)}")
        return

    # Process each book
    books = bible_data["XMLBIBLE"]["BIBLEBOOK"]
    if not isinstance(books, list):
        books = [books]  # Handle case where there's only one book

    # First pass: Create all verses
    print("\nFirst pass: Creating verses...")
    for book in tqdm(books, desc="Creating verses"):
        try:
            book_name = book["@bname"]
            book_number = int(book["@bnumber"])
            
            # Process each chapter
            chapters = book["CHAPTER"]
            if not isinstance(chapters, list):
                chapters = [chapters]

            for chapter in chapters:
                chapter_num = int(chapter["@cnumber"])
                
                # Process each verse
                verses = chapter["VERS"]
                if not isinstance(verses, list):
                    verses = [verses]

                for verse in verses:
                    verse_num = int(verse["@vnumber"])
                    verse_text = verse.get("#text", "")
                    if isinstance(verse_text, list):
                        verse_text = " ".join(verse_text)
                    verse_text = clean_text(verse_text)
                    
                    # Create verse node
                    with driver.session() as session:
                        create_verse(session, book_name, book_number, chapter_num, verse_num, verse_text)
        except Exception as e:
            print(f"Error processing book {book_name}: {str(e)}")
            continue

    # Second pass: Create cross-references
    print("\nSecond pass: Creating cross-references...")
    total_refs = 0
    for book in tqdm(books, desc="Creating cross-references"):
        try:
            book_name = book["@bname"]
            chapters = book["CHAPTER"]
            if not isinstance(chapters, list):
                chapters = [chapters]

            for chapter in chapters:
                chapter_num = int(chapter["@cnumber"])
                verses = chapter["VERS"]
                if not isinstance(verses, list):
                    verses = [verses]

                for verse in verses:
                    verse_num = int(verse["@vnumber"])
                    
                    # Create sequential cross-references
                    if verse_num > 1:
                        with driver.session() as session:
                            total_refs += create_cross_reference(
                                session,
                                book_name, chapter_num, verse_num - 1,
                                book_name, chapter_num, verse_num
                            )
                    
                    # Create chapter cross-references
                    if chapter_num > 1 and verse_num == 1:
                        with driver.session() as session:
                            total_refs += create_cross_reference(
                                session,
                                book_name, chapter_num - 1, 1,
                                book_name, chapter_num, verse_num
                            )
        except Exception as e:
            print(f"Error creating cross-references for book {book_name}: {str(e)}")
            continue

    print(f"\nCreated {total_refs} cross-references")
    print("\nImport completed successfully!")

if __name__ == "__main__":
    try:
        import_bible_data()
    except Exception as e:
        print(f"\nFatal error during import: {str(e)}")
        sys.exit(1) 