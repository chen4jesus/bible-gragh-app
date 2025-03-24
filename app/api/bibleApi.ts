/**
 * Bible API Service
 * 
 * This module provides a centralized interface for all Bible API requests.
 * It handles API URL construction, HTTP requests, error handling, and response parsing.
 */

import axios, { AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Base API URL - can be configured based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function to ensure API URLs don't include locale prefix
const removeLocaleFromPath = (url: string): string => {
  // Don't process absolute URLs that include API_BASE_URL
  if (url.startsWith(API_BASE_URL)) {
    return url;
  }
  
  // Handle relative URLs by removing locale prefix if present
  const localeRegex = /^\/(en|zh)(\/.*)$/;
  const match = url.match(localeRegex);
  if (match) {
    return match[2]; // Return the path without the locale
  }
  return url;
};

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

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
}

export interface UserRegisterData {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface UserLoginData {
  username: string;
  password: string;
}

export interface TokenData {
  access_token: string;
  token_type: string;
}

export interface KnowledgeCard {
  id: string;
  title: string;
  content: string;
  tags: string[];
  type: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  verse_reference: {
    book: string;
    chapter: number;
    verse: number;
  };
}

export interface KnowledgeCardCreate {
  title: string;
  content: string;
  tags?: string[];
  type?: string;
  verse_reference: {
    book: string;
    chapter: number;
    verse: number;
    text?: string;
  };
}

export interface KnowledgeCardUpdate {
  title?: string;
  content?: string;
  tags?: string[];
  type?: string;
}

// Add the KnowledgeGraphData type and interface definitions
export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: 'verse' | 'knowledge_card';
  // Verse properties
  book?: string;
  chapter?: number;
  verse?: number;
  text?: string;
  // Knowledge card properties
  card_id?: string;
  title?: string;
  content?: string;
  card_type?: string;
  tags?: string[];
  user_id?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
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
  GRAPH_DATA_WITH_PARAMS: (book?: string, chapter?: number, verse?: number, includeKnowledgeCards: boolean = false, limit: number = 100) => {
    let url = `${API_BASE_URL}/graph-data`;
    const params = new URLSearchParams();
    
    if (book) params.append('book', book);
    if (chapter !== undefined) params.append('chapter', chapter.toString());
    if (verse !== undefined) params.append('verse', verse.toString());
    if (includeKnowledgeCards) params.append('include_knowledge_cards', 'true');
    if (limit) params.append('limit', limit.toString());
    
    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  },
  
  /**
   * Get comprehensive knowledge graph
   */
  KNOWLEDGE_GRAPH: `${API_BASE_URL}/knowledge-graph`,
  
  /**
   * Get filtered knowledge graph
   */
  KNOWLEDGE_GRAPH_WITH_PARAMS: (book?: string, chapter?: number, verse?: number, depth: number = 2, limit: number = 100) => {
    let url = `${API_BASE_URL}/knowledge-graph`;
    const params = new URLSearchParams();
    
    if (book) params.append('book', book);
    if (chapter !== undefined) params.append('chapter', chapter.toString());
    if (verse !== undefined) params.append('verse', verse.toString());
    if (depth) params.append('depth', depth.toString());
    if (limit) params.append('limit', limit.toString());
    
    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  },
  
  /**
   * Get cross-references for a specific verse
   */
  CROSS_REFERENCES: (book: string, chapter: number, verse: number) => 
    `${API_BASE_URL}/cross-references/${book}/${chapter}/${verse}`,
    
  /**
   * Authentication endpoints
   */
  REGISTER: `${API_BASE_URL}/register`,
  LOGIN: `${API_BASE_URL}/token`,
  CURRENT_USER: `${API_BASE_URL}/users/me`,
  
  /**
   * Knowledge card endpoints
   */
  KNOWLEDGE_CARDS: `${API_BASE_URL}/knowledge-cards`,
  KNOWLEDGE_CARD: (id: string) => `${API_BASE_URL}/knowledge-cards/${id}`,
  VERSE_KNOWLEDGE_CARDS: (book: string, chapter: number, verse: number) => 
    `${API_BASE_URL}/verses/${book}/${chapter}/${verse}/knowledge-cards`,
};

// Axios instance with authentication
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('bibleGraph_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Ensure URL doesn't have locale prefix
    if (config.url) {
      config.url = removeLocaleFromPath(config.url);
    }
    
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

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
      const response = await apiClient.get<VerseData>(ENDPOINTS.VERSE(book, chapter, verse));
      return response.data;
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
      const response = await apiClient.get<GraphData[]>(ENDPOINTS.GRAPH_DATA);
      return response.data;
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
  async getFilteredGraphData(
    book?: string, 
    chapter?: number, 
    verse?: number, 
    limit: number = 100,
    includeKnowledgeCards: boolean = false
  ): Promise<GraphData[]> {
    try {
      // Check if we need authentication for knowledge cards
      if (includeKnowledgeCards) {
        const token = localStorage.getItem('bibleGraph_token');
        if (!token) {
          console.log('Authentication required to include knowledge cards');
          // Fall back to non-knowledge card version
          includeKnowledgeCards = false;
        }
      }
      
      const url = ENDPOINTS.GRAPH_DATA_WITH_PARAMS(book, chapter, verse, includeKnowledgeCards, limit);
      const response = await apiClient.get<GraphData[] | { verse_connections: GraphData[], knowledge_card_connections: any[] }>(url);
      
      if (Array.isArray(response.data)) {
        return response.data;
      } else {
        // Combined format with verse_connections and knowledge_card_connections
        return response.data.verse_connections;
      }
    } catch (error) {
      // Handle authentication errors for knowledge cards
      if (axios.isAxiosError(error) && error.response?.status === 401 && includeKnowledgeCards) {
        console.log('Authentication required to include knowledge cards');
        // Retry without knowledge cards
        return this.getFilteredGraphData(book, chapter, verse, limit, false);
      }
      
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
      const response = await apiClient.get<CrossReferenceData[]>(ENDPOINTS.CROSS_REFERENCES(book, chapter, verse));
      return response.data;
    } catch (error) {
      console.error('Error fetching cross-references:', error);
      throw error;
    }
  },

  // Authentication methods
  async register(userData: UserRegisterData): Promise<User> {
    try {
      const response = await apiClient.post<User>(ENDPOINTS.REGISTER, userData);
      return response.data;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },

  async login(loginData: UserLoginData): Promise<TokenData> {
    try {
      // Create FormData for authentication
      // OAuth2PasswordRequestForm expects x-www-form-urlencoded format
      const formData = new URLSearchParams();
      formData.append('username', loginData.username);
      formData.append('password', loginData.password);
      
      const response = await apiClient.post<TokenData>(
        ENDPOINTS.LOGIN, 
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      // Store the token in localStorage
      localStorage.setItem('bibleGraph_token', response.data.access_token);
      
      return response.data;
    } catch (error: any) {
      console.error('Error logging in:', error);
      // Extract error message from response if available
      if (error.response?.data?.detail) {
        // Convert to string if it's an object
        const detail = typeof error.response.data.detail === 'object' 
          ? JSON.stringify(error.response.data.detail) 
          : error.response.data.detail;
        throw new Error(detail);
      }
      // Default error message
      throw new Error('Failed to login. Please check your credentials and try again.');
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<User>(ENDPOINTS.CURRENT_USER);
      return response.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem('bibleGraph_token');
  },

  // Knowledge Card methods
  async createKnowledgeCard(cardData: KnowledgeCardCreate): Promise<KnowledgeCard> {
    try {
      const response = await apiClient.post<KnowledgeCard>(ENDPOINTS.KNOWLEDGE_CARDS, cardData);
      return response.data;
    } catch (error) {
      console.error('Error creating knowledge card:', error);
      throw error;
    }
  },

  async getKnowledgeCards(filters?: {
    book?: string;
    chapter?: number;
    verse?: number;
    type?: string;
  }): Promise<KnowledgeCard[]> {
    try {
      const response = await apiClient.get<KnowledgeCard[]>(ENDPOINTS.KNOWLEDGE_CARDS, {
        params: filters,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching knowledge cards:', error);
      throw error;
    }
  },

  async getKnowledgeCard(cardId: string): Promise<KnowledgeCard> {
    try {
      const response = await apiClient.get<KnowledgeCard>(ENDPOINTS.KNOWLEDGE_CARD(cardId));
      return response.data;
    } catch (error) {
      console.error('Error fetching knowledge card:', error);
      throw error;
    }
  },

  async updateKnowledgeCard(cardId: string, cardData: KnowledgeCardUpdate): Promise<KnowledgeCard> {
    try {
      const response = await apiClient.put<KnowledgeCard>(ENDPOINTS.KNOWLEDGE_CARD(cardId), cardData);
      return response.data;
    } catch (error) {
      console.error('Error updating knowledge card:', error);
      throw error;
    }
  },

  async deleteKnowledgeCard(cardId: string): Promise<void> {
    try {
      await apiClient.delete(ENDPOINTS.KNOWLEDGE_CARD(cardId));
    } catch (error) {
      console.error('Error deleting knowledge card:', error);
      throw error;
    }
  },

  /**
   * Fetch knowledge cards for a specific verse
   * 
   * @param book - Bible book name
   * @param chapter - Chapter number
   * @param verse - Verse number
   * @returns Promise with an array of knowledge cards
   * @throws Error if the API request fails
   */
  async getVerseKnowledgeCards(book: string, chapter: number, verse: number): Promise<KnowledgeCard[]> {
    try {
      const token = localStorage.getItem('bibleGraph_token');
      if (!token) {
        console.log('Authentication required to fetch knowledge cards');
        return []; // Return empty array when token is not available
      }
      
      const response = await apiClient.get<KnowledgeCard[]>(
        ENDPOINTS.VERSE_KNOWLEDGE_CARDS(book, chapter, verse)
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log('Authentication required to fetch knowledge cards');
        return []; // Return empty array on authentication error
      }
      console.error('Error fetching verse knowledge cards:', error);
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('bibleGraph_token');
  },

  /**
   * Fetch comprehensive knowledge graph
   * 
   * @param book - Optional book filter
   * @param chapter - Optional chapter filter
   * @param verse - Optional verse filter
   * @param depth - Depth of relationships to traverse
   * @param limit - Maximum number of results to return
   * @returns Promise with comprehensive knowledge graph data
   * @throws Error if the API request fails
   */
  async getKnowledgeGraph(
    book?: string,
    chapter?: number,
    verse?: number,
    depth: number = 2,
    limit: number = 100
  ): Promise<KnowledgeGraphData> {
    try {
      // Check authentication status
      const token = localStorage.getItem('bibleGraph_token');
      if (!token) {
        console.log('Authentication required to fetch knowledge graph');
        // Return empty graph structure
        return { nodes: [], edges: [] };
      }
      
      const url = ENDPOINTS.KNOWLEDGE_GRAPH_WITH_PARAMS(book, chapter, verse, depth, limit);
      const response = await apiClient.get<KnowledgeGraphData>(url);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log('Authentication required to fetch knowledge graph');
        // Return empty graph structure on authentication error
        return { nodes: [], edges: [] };
      }
      console.error('Error fetching knowledge graph:', error);
      throw error;
    }
  },
}; 