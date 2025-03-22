from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from neo4j import GraphDatabase
from typing import List, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Bible Graph API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Neo4j connection
uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
user = os.getenv("NEO4J_USER", "neo4j")
password = os.getenv("NEO4J_PASSWORD", "password")

driver = GraphDatabase.driver(uri, auth=(user, password))

def get_db():
    try:
        session = driver.session()
        yield session
    finally:
        session.close()

@app.get("/")
async def root():
    return {"message": "Bible Graph API is running"}

@app.get("/verses/{book}/{chapter}/{verse}")
async def get_verse(book: str, chapter: int, verse: int):
    with driver.session() as session:
        result = session.run(
            """
            MATCH (v:Verse)
            WHERE v.book = $book AND v.chapter = $chapter AND v.verse = $verse
            RETURN v
            """,
            book=book, chapter=chapter, verse=verse
        )
        verse_data = result.single()
        if not verse_data:
            raise HTTPException(status_code=404, detail="Verse not found")
        return dict(verse_data["v"])

@app.get("/cross-references/{book}/{chapter}/{verse}")
async def get_cross_references(book: str, chapter: int, verse: int):
    with driver.session() as session:
        result = session.run(
            """
            MATCH (v1:Verse)-[r:REFERENCES]->(v2:Verse)
            WHERE v1.book = $book AND v1.chapter = $chapter AND v1.verse = $verse
            RETURN v2.book as book, v2.chapter as chapter, v2.verse as verse, v2.text as text
            """,
            book=book, chapter=chapter, verse=verse
        )
        return [dict(record) for record in result]

@app.get("/graph-data")
async def get_graph_data():
    with driver.session() as session:
        # First, check if we have any verses
        verse_count = session.run(
            """
            MATCH (v:Verse)
            RETURN count(v) as count
            """
        ).single()["count"]
        
        # Then check if we have any references
        ref_count = session.run(
            """
            MATCH ()-[r:REFERENCES]->()
            RETURN count(r) as count
            """
        ).single()["count"]
        
        print(f"Found {verse_count} verses and {ref_count} references")
        
        if verse_count == 0:
            # Create some sample verses
            session.run("""
                CREATE (v1:Verse {book: '创世记', chapter: 1, verse: 1, text: '起初，神创造天地。'})
                CREATE (v2:Verse {book: '创世记', chapter: 1, verse: 2, text: '地是空虚混沌，渊面黑暗；神的灵运行在水面上。'})
                CREATE (v3:Verse {book: '创世记', chapter: 1, verse: 3, text: '神说：「要有光」，就有了光。'})
                CREATE (v4:Verse {book: '创世记', chapter: 1, verse: 4, text: '神看光是好的，就把光暗分开了。'})
                CREATE (v5:Verse {book: '创世记', chapter: 1, verse: 5, text: '神称光为「昼」，称暗为「夜」。有晚上，有早晨，这是头一日。'})
                CREATE (v1)-[:REFERENCES]->(v2)
                CREATE (v2)-[:REFERENCES]->(v3)
                CREATE (v3)-[:REFERENCES]->(v4)
                CREATE (v4)-[:REFERENCES]->(v5)
            """)
            print("Created sample verses and references")
            
            result = session.run(
                """
                MATCH (v1:Verse)-[r:REFERENCES]->(v2:Verse)
                RETURN 
                    v1.book as source_book, 
                    v1.chapter as source_chapter, 
                    v1.verse as source_verse,
                    v2.book as target_book, 
                    v2.chapter as target_chapter, 
                    v2.verse as target_verse
                """
            )
        else:
            result = session.run(
                """
                MATCH (v1:Verse)-[r:REFERENCES]->(v2:Verse)
                RETURN 
                    v1.book as source_book, 
                    v1.chapter as source_chapter, 
                    v1.verse as source_verse,
                    v2.book as target_book, 
                    v2.chapter as target_chapter, 
                    v2.verse as target_verse
                LIMIT 100
                """
            )
        
        data = [dict(record) for record in result]
        print(f"Returning {len(data)} graph data records")
        return data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 