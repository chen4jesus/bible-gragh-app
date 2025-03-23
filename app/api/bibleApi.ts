/**
 * Bible API Service
 * 
 * This module provides a centralized interface for all Bible API requests.
 * It handles API URL construction, HTTP requests, error handling, and response parsing.
 */

// Base API URL - can be configured based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
export interface VerseData {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface GraphData {
  source_book: string;
  source_chapter: number;
  source_verse: number;
  target_book: string;
  target_chapter: number;
  target_verse: number;
  relationship_type?: string;
}

export interface CrossReferenceData {
  target_book: string;
  target_chapter: number;
  target_verse: number;
  target_text?: string;
}

/**
 * API Endpoints
 * 
 * Centralized configuration of all Bible API endpoints
 * This helps maintain consistency and makes it easier to update URLs
 */
const ENDPOINTS = {
  /**
   * Get a specific verse by book, chapter, and verse number
   */
  VERSE: (book: string, chapter: number, verse: number) => 
    `${API_BASE_URL}/verses/${book}/${chapter}/${verse}`,
  
  /**
   * Get all graph data for visualization
   */
  GRAPH_DATA: `${API_BASE_URL}/graph-data`,
  
  /**
   * Get filtered graph data based on various parameters
   */
  GRAPH_DATA_WITH_PARAMS: (book?: string, chapter?: number, verse?: number, limit: number = 100) => {
    let url = `${API_BASE_URL}/graph-data`;
    const params = new URLSearchParams();
    
    if (book) params.append('book', book);
    if (chapter !== undefined) params.append('chapter', chapter.toString());
    if (verse !== undefined) params.append('verse', verse.toString());
    if (limit) params.append('limit', limit.toString());
    
    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  },
  
  /**
   * Get cross-references for a specific verse
   */
  CROSS_REFERENCES: (book: string, chapter: number, verse: number) => 
    `${API_BASE_URL}/cross-references/${book}/${chapter}/${verse}`,
};

/**
 * Bible API Service
 * 
 * Provides methods for interacting with the Bible API endpoints.
 * Each method handles its own error handling and response parsing.
 */
export const bibleApi = {
  /**
   * Fetch a specific verse by book, chapter, and verse number
   * 
   * @param book - Bible book name
   * @param chapter - Chapter number
   * @param verse - Verse number
   * @returns Promise with verse data
   * @throws Error if the API request fails
   */
  async getVerse(book: string, chapter: number, verse: number): Promise<VerseData> {
    try {
      const response = await fetch(ENDPOINTS.VERSE(book, chapter, verse));
      if (!response.ok) {
        throw new Error(`Failed to fetch verse: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching verse:', error);
      throw error;
    }
  },

  /**
   * Fetch all graph data for visualization
   * 
   * @returns Promise with an array of graph data
   * @throws Error if the API request fails
   */
  async getGraphData(): Promise<GraphData[]> {
    try {
      const response = await fetch(ENDPOINTS.GRAPH_DATA);
      if (!response.ok) {
        throw new Error(`Failed to fetch graph data: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching graph data:', error);
      throw error;
    }
  },

  /**
   * Fetch graph data with filters
   * 
   * @param book - Optional book filter
   * @param chapter - Optional chapter filter
   * @param verse - Optional verse filter
   * @param limit - Maximum number of results to return
   * @returns Promise with filtered graph data
   * @throws Error if the API request fails
   */
  async getFilteredGraphData(book?: string, chapter?: number, verse?: number, limit: number = 100): Promise<GraphData[]> {
    try {
      const url = ENDPOINTS.GRAPH_DATA_WITH_PARAMS(book, chapter, verse, limit);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch filtered graph data: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching filtered graph data:', error);
      throw error;
    }
  },

  /**
   * Fetch cross-references for a specific verse
   * 
   * @param book - Bible book name
   * @param chapter - Chapter number
   * @param verse - Verse number
   * @returns Promise with cross-reference data
   * @throws Error if the API request fails
   */
  async getCrossReferences(book: string, chapter: number, verse: number): Promise<CrossReferenceData[]> {
    try {
      const response = await fetch(ENDPOINTS.CROSS_REFERENCES(book, chapter, verse));
      if (!response.ok) {
        throw new Error(`Failed to fetch cross-references: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching cross-references:', error);
      throw error;
    }
  }
}; 