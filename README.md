# Bible Cross-References Graph Visualization

This application visualizes cross-references in the Bible using a graph database (Neo4j) and React Flow.

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Neo4j Database (local installation or cloud instance)
- The Bible XML file in Chinese (CUVS version)

## Setup

1. Install Neo4j:
   - Download and install Neo4j Desktop from https://neo4j.com/download/
   - Create a new database
   - Set a password and start the database

2. Configure the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your Neo4j credentials
   ```

3. Import the Bible data:
   ```bash
   cd backend
   python app/import_bible.py
   ```

4. Start the backend server:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

5. Install frontend dependencies:
   ```bash
   npm install
   ```

6. Start the frontend development server:
   ```bash
   npm run dev
   ```

## Usage

1. Open your browser and navigate to http://localhost:3000
2. The graph visualization will show Bible verses and their cross-references
3. Use the controls to zoom, pan, and interact with the graph
4. Click on nodes to see more details about specific verses

## Features

- Interactive graph visualization of Bible cross-references
- Real-time data fetching from Neo4j database
- Smooth animations and transitions
- Responsive design
- Zoom and pan controls
- Node and edge highlighting

## API Endpoints

- `GET /`: Health check endpoint
- `GET /verses/{book}/{chapter}/{verse}`: Get a specific verse
- `GET /cross-references/{book}/{chapter}/{verse}`: Get cross-references for a verse
- `GET /graph-data`: Get graph data for visualization

## Technologies Used

- Frontend:
  - Next.js 14
  - React Flow
  - TypeScript
  - Tailwind CSS

- Backend:
  - FastAPI
  - Neo4j
  - Python
  - XML parsing

## License

MIT
