from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from neo4j import GraphDatabase
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
import bcrypt
import jwt
from uuid import uuid4

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
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-jwt")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

driver = GraphDatabase.driver(uri, auth=(user, password))

# OAuth2 scheme for JWT token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Pydantic models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str
    sub: str

class KnowledgeCardCreate(BaseModel):
    title: str
    content: str
    tags: List[str] = []
    type: str = "note"  # note, commentary, reflection
    verse_reference: Dict[str, Any]  # { book: str, chapter: int, verse: int }

class KnowledgeCardUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    type: Optional[str] = None

class KnowledgeCardResponse(BaseModel):
    id: str
    title: str
    content: str
    tags: List[str]
    type: str
    created_at: datetime
    updated_at: datetime
    user_id: str
    verse_reference: Dict[str, Any]

def get_db():
    try:
        session = driver.session()
        yield session
    finally:
        session.close()

def convert_neo4j_datetime(neo4j_datetime):
    """Convert Neo4j DateTime objects to Python datetime objects"""
    if hasattr(neo4j_datetime, 'to_native'):
        return neo4j_datetime.to_native()
    return neo4j_datetime

# Authentication functions
def get_password_hash(password: str) -> str:
    """Generate hashed password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed_pw = bcrypt.hashpw(password.encode(), salt)
    return hashed_pw.decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hashed password"""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        if username is None or user_id is None:
            raise credentials_exception
        token_data = TokenData(username=username, sub=user_id)
    except jwt.PyJWTError:
        raise credentials_exception
    
    with driver.session() as session:
        user = session.run(
            """
            MATCH (u:User {id: $user_id, username: $username})
            RETURN u
            """,
            user_id=token_data.sub, username=token_data.username
        ).single()
        
        if user is None:
            raise credentials_exception
        
        return user["u"]

# Initialize database schema (run only at startup)
def init_db():
    with driver.session() as session:
        # Create constraints
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (k:KnowledgeCard) REQUIRE k.id IS UNIQUE")
        session.run("CREATE INDEX IF NOT EXISTS FOR (k:KnowledgeCard) ON (k.created_at)")
        session.run("CREATE INDEX IF NOT EXISTS FOR (k:KnowledgeCard) ON (k.type)")

# Initialize DB at startup
init_db()

@app.get("/")
async def root():
    return {"message": "Bible Graph API is running"}

# User registration and login endpoints
@app.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    with driver.session() as session:
        # Check if username already exists
        existing_user = session.run(
            """
            MATCH (u:User)
            WHERE u.username = $username OR u.email = $email
            RETURN u
            """,
            username=user.username, email=user.email
        ).single()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already exists"
            )
        
        # Create new user
        user_id = str(uuid4())
        hashed_password = get_password_hash(user.password)
        
        user_data = session.run(
            """
            CREATE (u:User {
                id: $id,
                username: $username,
                email: $email,
                password: $password,
                full_name: $full_name,
                created_at: datetime()
            })
            RETURN u
            """,
            id=user_id,
            username=user.username,
            email=user.email,
            password=hashed_password,
            full_name=user.full_name
        ).single()
        
        user_dict = dict(user_data["u"])
        return UserResponse(
            id=user_dict["id"],
            username=user_dict["username"],
            email=user_dict["email"],
            full_name=user_dict.get("full_name")
        )

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    with driver.session() as session:
        user = session.run(
            """
            MATCH (u:User {username: $username})
            RETURN u
            """,
            username=form_data.username
        ).single()
        
        if not user or not verify_password(form_data.password, user["u"]["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["u"]["username"], "user_id": user["u"]["id"]},
            expires_delta=access_token_expires,
        )
        
        return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user["email"],
        full_name=current_user.get("full_name")
    )

# Knowledge Card endpoints
@app.post("/knowledge-cards", response_model=KnowledgeCardResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_card(
    card: KnowledgeCardCreate, 
    current_user: dict = Depends(get_current_user)
):
    with driver.session() as session:
        # Verify verse exists
        verse_ref = card.verse_reference
        verse = session.run(
            """
            MATCH (v:Verse {book: $book, chapter: $chapter, verse: $verse})
            RETURN v
            """,
            book=verse_ref.get("book"),
            chapter=verse_ref.get("chapter"),
            verse=verse_ref.get("verse")
        ).single()
        
        if not verse:
            # Create the verse if it doesn't exist
            session.run(
                """
                CREATE (v:Verse {
                    book: $book,
                    chapter: $chapter,
                    verse: $verse,
                    text: $text
                })
                """,
                book=verse_ref.get("book"),
                chapter=verse_ref.get("chapter"),
                verse=verse_ref.get("verse"),
                text=verse_ref.get("text", "")
            )
        
        # Create knowledge card
        card_id = str(uuid4())
        now = datetime.utcnow()
        
        result = session.run(
            """
            MATCH (u:User {id: $user_id})
            MATCH (v:Verse {book: $book, chapter: $chapter, verse: $verse})
            CREATE (k:KnowledgeCard {
                id: $id,
                title: $title,
                content: $content,
                tags: $tags,
                type: $type,
                created_at: datetime(),
                updated_at: datetime(),
                user_id: $user_id
            })
            CREATE (u)-[:CREATED]->(k)
            CREATE (k)-[:REFERENCES]->(v)
            RETURN k, v.book as verse_book, v.chapter as verse_chapter, v.verse as verse_verse
            """,
            id=card_id,
            title=card.title,
            content=card.content,
            tags=card.tags,
            type=card.type,
            user_id=current_user["id"],
            book=verse_ref.get("book"),
            chapter=verse_ref.get("chapter"),
            verse=verse_ref.get("verse")
        ).single()
        
        card_data = dict(result["k"])
        
        return KnowledgeCardResponse(
            id=card_data["id"],
            title=card_data["title"],
            content=card_data["content"],
            tags=card_data["tags"],
            type=card_data["type"],
            created_at=convert_neo4j_datetime(card_data["created_at"]),
            updated_at=convert_neo4j_datetime(card_data["updated_at"]),
            user_id=card_data["user_id"],
            verse_reference={
                "book": result["verse_book"],
                "chapter": result["verse_chapter"],
                "verse": result["verse_verse"]
            }
        )

@app.get("/knowledge-cards", response_model=List[KnowledgeCardResponse])
async def get_knowledge_cards(
    book: Optional[str] = None,
    chapter: Optional[int] = None,
    verse: Optional[int] = None,
    card_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    with driver.session() as session:
        # Build query based on filters
        query = """
        MATCH (u:User {id: $user_id})-[:CREATED]->(k:KnowledgeCard)-[:REFERENCES]->(v:Verse)
        """
        
        # Add WHERE clause based on parameters
        where_clauses = []
        params = {"user_id": current_user["id"]}
        
        if book:
            where_clauses.append("v.book = $book")
            params["book"] = book
            
        if chapter:
            where_clauses.append("v.chapter = $chapter")
            params["chapter"] = chapter
            
        if verse:
            where_clauses.append("v.verse = $verse")
            params["verse"] = verse
            
        if card_type:
            where_clauses.append("k.type = $type")
            params["type"] = card_type

        if where_clauses:
            query += "\nWHERE " + " AND ".join(where_clauses)

        # Add return
        query += """
        RETURN k, v.book as verse_book, v.chapter as verse_chapter, v.verse as verse_verse
        ORDER BY k.created_at DESC
        """
        
        results = session.run(query, params)
        
        cards = []
        for record in results:
            card_data = dict(record["k"])
            cards.append(
                KnowledgeCardResponse(
                    id=card_data["id"],
                    title=card_data["title"],
                    content=card_data["content"],
                    tags=card_data["tags"],
                    type=card_data["type"],
                    created_at=convert_neo4j_datetime(card_data["created_at"]),
                    updated_at=convert_neo4j_datetime(card_data["updated_at"]),
                    user_id=card_data["user_id"],
                    verse_reference={
                        "book": record["verse_book"],
                        "chapter": record["verse_chapter"],
                        "verse": record["verse_verse"]
                    }
                )
            )
        
        return cards

@app.get("/knowledge-cards/{card_id}", response_model=KnowledgeCardResponse)
async def get_knowledge_card(
    card_id: str,
    current_user: dict = Depends(get_current_user)
):
    with driver.session() as session:
        result = session.run(
            """
            MATCH (u:User {id: $user_id})-[:CREATED]->(k:KnowledgeCard {id: $card_id})-[:REFERENCES]->(v:Verse)
            RETURN k, v.book as verse_book, v.chapter as verse_chapter, v.verse as verse_verse
            """,
            user_id=current_user["id"],
            card_id=card_id
        ).single()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge card not found"
            )
        
        card_data = dict(result["k"])
        
        return KnowledgeCardResponse(
            id=card_data["id"],
            title=card_data["title"],
            content=card_data["content"],
            tags=card_data["tags"],
            type=card_data["type"],
            created_at=convert_neo4j_datetime(card_data["created_at"]),
            updated_at=convert_neo4j_datetime(card_data["updated_at"]),
            user_id=card_data["user_id"],
            verse_reference={
                "book": result["verse_book"],
                "chapter": result["verse_chapter"],
                "verse": result["verse_verse"]
            }
        )

@app.put("/knowledge-cards/{card_id}", response_model=KnowledgeCardResponse)
async def update_knowledge_card(
    card_id: str,
    card_update: KnowledgeCardUpdate,
    current_user: dict = Depends(get_current_user)
):
    with driver.session() as session:
        # Check if card exists and belongs to user
        existing_card = session.run(
            """
            MATCH (u:User {id: $user_id})-[:CREATED]->(k:KnowledgeCard {id: $card_id})
            RETURN k
            """,
            user_id=current_user["id"],
            card_id=card_id
        ).single()
        
        if not existing_card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge card not found or you don't have permission to update it"
            )
        
        # Build update query
        update_parts = []
        params = {
            "user_id": current_user["id"],
            "card_id": card_id,
            "updated_at": datetime.utcnow()
        }
        
        if card_update.title is not None:
            update_parts.append("k.title = $title")
            params["title"] = card_update.title
            
        if card_update.content is not None:
            update_parts.append("k.content = $content")
            params["content"] = card_update.content
            
        if card_update.tags is not None:
            update_parts.append("k.tags = $tags")
            params["tags"] = card_update.tags
            
        if card_update.type is not None:
            update_parts.append("k.type = $type")
            params["type"] = card_update.type
        
        # Always update the updated_at timestamp
        update_parts.append("k.updated_at = datetime()")
        
        update_query = f"""
        MATCH (u:User {{id: $user_id}})-[:CREATED]->(k:KnowledgeCard {{id: $card_id}})-[:REFERENCES]->(v:Verse)
        SET {', '.join(update_parts)}
        RETURN k, v.book as verse_book, v.chapter as verse_chapter, v.verse as verse_verse
        """
        
        result = session.run(update_query, params).single()
        
        card_data = dict(result["k"])
        
        return KnowledgeCardResponse(
            id=card_data["id"],
            title=card_data["title"],
            content=card_data["content"],
            tags=card_data["tags"],
            type=card_data["type"],
            created_at=convert_neo4j_datetime(card_data["created_at"]),
            updated_at=convert_neo4j_datetime(card_data["updated_at"]),
            user_id=card_data["user_id"],
            verse_reference={
                "book": result["verse_book"],
                "chapter": result["verse_chapter"],
                "verse": result["verse_verse"]
            }
        )

@app.delete("/knowledge-cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_card(
    card_id: str,
    current_user: dict = Depends(get_current_user)
):
    with driver.session() as session:
        # Check if card exists and belongs to user
        result = session.run(
            """
            MATCH (u:User {id: $user_id})-[:CREATED]->(k:KnowledgeCard {id: $card_id})
            RETURN k
            """,
            user_id=current_user["id"],
            card_id=card_id
        ).single()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge card not found or you don't have permission to delete it"
            )
        
        # Delete the card
        session.run(
            """
            MATCH (u:User {id: $user_id})-[:CREATED]->(k:KnowledgeCard {id: $card_id})
            DETACH DELETE k
            """,
            user_id=current_user["id"],
            card_id=card_id
        )
        
        return None

# Get all public knowledge cards for a specific verse
@app.get("/verses/{book}/{chapter}/{verse}/knowledge-cards", response_model=List[KnowledgeCardResponse])
async def get_verse_knowledge_cards(
    book: str, 
    chapter: int, 
    verse: int,
    current_user: Optional[dict] = Depends(get_current_user)
):
    with driver.session() as session:
        # Get cards created by the current user and public cards created by others
        query = """
        MATCH (k:KnowledgeCard)-[:REFERENCES]->(v:Verse {book: $book, chapter: $chapter, verse: $verse})
        MATCH (u:User)-[:CREATED]->(k)
        WHERE u.id = $user_id OR k.is_public = true
        RETURN k, u.username as creator_username, v.book as verse_book, v.chapter as verse_chapter, v.verse as verse_verse
        ORDER BY k.created_at DESC
        """
        
        results = session.run(
            query,
            book=book,
            chapter=chapter,
            verse=verse,
            user_id=current_user["id"] if current_user else ""
        )
        
        cards = []
        for record in results:
            card_data = dict(record["k"])
            cards.append(
                KnowledgeCardResponse(
                    id=card_data["id"],
                    title=card_data["title"],
                    content=card_data["content"],
                    tags=card_data["tags"],
                    type=card_data["type"],
                    created_at=convert_neo4j_datetime(card_data["created_at"]),
                    updated_at=convert_neo4j_datetime(card_data["updated_at"]),
                    user_id=card_data["user_id"],
                    verse_reference={
                        "book": record["verse_book"],
                        "chapter": record["verse_chapter"],
                        "verse": record["verse_verse"]
                    }
                )
            )
        
        return cards

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
            RETURN v2.book as target_book, v2.chapter as target_chapter, v2.verse as target_verse, v2.text as target_text
            """,
            book=book, chapter=chapter, verse=verse
        )
        return [dict(record) for record in result]

@app.get("/graph-data")
async def get_graph_data(
    book: Optional[str] = Query(None, description="Filter by book name"),
    chapter: Optional[int] = Query(None, description="Filter by chapter number"),
    verse: Optional[int] = Query(None, description="Filter by verse number"),
    limit: Optional[int] = Query(100, description="Limit the number of results")
):
    with driver.session() as session:
        # First, check if we have any verses
        verse_count = session.run(
            """
            MATCH (v:Verse)
            RETURN count(v) as count
            """
        ).single()["count"]
        
        if verse_count == 0:
            # Create sample verses if no data exists using a transaction
            # to ensure they are properly created
            try:
                transaction = session.begin_transaction()
                transaction.run("""
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
                transaction.commit()
                print("Successfully created sample verses")
            except Exception as e:
                print(f"Error creating sample verses: {e}")
                # Continue without creating sample verses

        # Build the query based on provided parameters
        query = """
        MATCH (v1:Verse)-[r:REFERENCES]->(v2:Verse)
        """
        
        # Add WHERE clause based on parameters
        where_clauses = []
        params = {}
        
        if book:
            where_clauses.append("(v1.book = $book OR v2.book = $book)")
            params["book"] = book
            
        if chapter:
            where_clauses.append("(v1.chapter = $chapter OR v2.chapter = $chapter)")
            params["chapter"] = chapter
            
        if verse:
            where_clauses.append("(v1.verse = $verse OR v2.verse = $verse)")
            params["verse"] = verse

        if where_clauses:
            query += "\nWHERE " + " AND ".join(where_clauses)

        # Add return and limit
        query += """
        RETURN 
            v1.book as source_book, 
            v1.chapter as source_chapter, 
            v1.verse as source_verse,
            v2.book as target_book, 
            v2.chapter as target_chapter, 
            v2.verse as target_verse
        LIMIT $limit
        """
        params["limit"] = limit

        result = session.run(query, params)
        data = [dict(record) for record in result]
        return data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 