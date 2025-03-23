'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { bibleApi, User } from '../api/bibleApi';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: any) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      if (initialized) return;
      
      setLoading(true);
      try {
        if (bibleApi.isAuthenticated()) {
          const userData = await bibleApi.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
        // Clear invalid tokens
        bibleApi.logout();
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();
  }, [initialized]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      await bibleApi.login({ username, password });
      const userData = await bibleApi.getCurrentUser();
      setUser(userData);
    } catch (error) {
      // Let the error propagate to the component for handling
      console.error('Login error in AuthContext:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    bibleApi.logout();
    setUser(null);
  };

  const register = async (userData: any) => {
    setLoading(true);
    try {
      await bibleApi.register(userData);
      await bibleApi.login({
        username: userData.username,
        password: userData.password,
      });
      const user = await bibleApi.getCurrentUser();
      setUser(user);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 