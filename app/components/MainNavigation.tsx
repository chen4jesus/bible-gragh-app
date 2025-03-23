'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { FiMenu, FiX, FiBook, FiUser, FiLogIn, FiLogOut, FiHome, FiFileText } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

export default function MainNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { locale } = useParams() as { locale: string };
  const { isAuthenticated, user, logout } = useAuth();
  const t = useTranslations();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const isActive = (path: string) => {
    const localizedPath = `/${locale}${path}`;
    return pathname === localizedPath || pathname === path;
  };

  const otherLocale = locale === 'en' ? 'zh' : 'en';

  // Function to create localized paths
  const getLocalePath = (path: string) => {
    return path === '/' ? `/${locale}` : `/${locale}${path}`;
  };

  // Function to create language switch path
  const getLanguageSwitchPath = () => {
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    return `/${otherLocale}${pathWithoutLocale || ''}`;
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href={getLocalePath('/')} className="flex items-center">
                <FiBook className="h-6 w-6 text-blue-600" />
                <span className="ml-2 text-xl font-semibold text-gray-900">Bible Graph</span>
              </Link>
            </div>
            
            {/* Desktop navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              <Link 
                href={getLocalePath('/')}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  isActive('/') 
                    ? 'text-blue-700 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                }`}
              >
                <FiHome className="mr-1.5 h-4 w-4" />
                {t('navigation.home')}
              </Link>
              
              <Link 
                href={getLocalePath('/graph')}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  isActive('/graph') 
                    ? 'text-blue-700 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                }`}
              >
                <FiBook className="mr-1.5 h-4 w-4" />
                {t('navigation.bibleGraph')}
              </Link>
              
              {isAuthenticated && (
                <Link 
                  href={getLocalePath('/knowledge-cards')}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive('/knowledge-cards') 
                      ? 'text-blue-700 bg-blue-50' 
                      : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <FiFileText className="mr-1.5 h-4 w-4" />
                  {t('navigation.myNotes')}
                </Link>
              )}
            </div>
          </div>
          
          {/* User authentication section */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700">
                  {user?.username || 'User'}
                </span>
                <button
                  onClick={logout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  <FiLogOut className="mr-1.5 h-4 w-4" />
                  {t('auth.logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href={getLocalePath('/login')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <FiLogIn className="mr-1.5 h-4 w-4" />
                  {t('auth.login')}
                </Link>
                <Link
                  href={getLocalePath('/register')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FiUser className="mr-1.5 h-4 w-4" />
                  {t('auth.register')}
                </Link>
              </div>
            )}
            
            {/* Language switcher */}
            <Link
              href={getLanguageSwitchPath()}
              className="ml-4 inline-flex items-center px-2 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {otherLocale.toUpperCase()}
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:outline-none"
            >
              {isMenuOpen ? (
                <FiX className="h-6 w-6" />
              ) : (
                <FiMenu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link 
              href={getLocalePath('/')}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/') 
                  ? 'text-blue-700 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
              }`}
              onClick={closeMenu}
            >
              <div className="flex items-center">
                <FiHome className="mr-2 h-5 w-5" />
                {t('navigation.home')}
              </div>
            </Link>
            
            <Link 
              href={getLocalePath('/graph')}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/graph') 
                  ? 'text-blue-700 bg-blue-50' 
                  : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
              }`}
              onClick={closeMenu}
            >
              <div className="flex items-center">
                <FiBook className="mr-2 h-5 w-5" />
                {t('navigation.bibleGraph')}
              </div>
            </Link>
            
            {isAuthenticated && (
              <Link 
                href={getLocalePath('/knowledge-cards')}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/knowledge-cards') 
                    ? 'text-blue-700 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                }`}
                onClick={closeMenu}
              >
                <div className="flex items-center">
                  <FiFileText className="mr-2 h-5 w-5" />
                  {t('navigation.myNotes')}
                </div>
              </Link>
            )}
          </div>
          
          {/* Mobile user actions */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            {isAuthenticated ? (
              <div className="px-4 space-y-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FiUser className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2" />
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">
                      {user?.username || 'User'}
                    </div>
                    <div className="text-sm font-medium text-gray-500">
                      {user?.email || ''}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                  className="w-full flex items-center px-3 py-2 text-base font-medium text-red-600 hover:bg-gray-100 hover:text-red-700 rounded-md"
                >
                  <FiLogOut className="mr-2 h-5 w-5" />
                  {t('auth.logout')}
                </button>
              </div>
            ) : (
              <div className="px-4 space-y-3">
                <Link
                  href={getLocalePath('/login')}
                  className="w-full flex items-center px-3 py-2 text-base font-medium text-blue-600 hover:bg-blue-50 rounded-md"
                  onClick={closeMenu}
                >
                  <FiLogIn className="mr-2 h-5 w-5" />
                  {t('auth.login')}
                </Link>
                <Link
                  href={getLocalePath('/register')}
                  className="w-full flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                  onClick={closeMenu}
                >
                  <FiUser className="mr-2 h-5 w-5" />
                  {t('auth.register')}
                </Link>
                
                {/* Mobile language switcher */}
                <Link
                  href={getLanguageSwitchPath()}
                  className="w-full flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                  onClick={closeMenu}
                >
                  {otherLocale === 'en' ? 'English' : '中文'}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 