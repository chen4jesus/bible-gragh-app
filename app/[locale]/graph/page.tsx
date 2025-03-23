'use client';

import { BibleGraph } from '../../components/BibleGraph';
import { useTranslations } from 'next-intl';

export default function GraphPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto p-4 h-screen">
      <h1 className="text-3xl font-bold mb-6">{t('navigation.bibleGraph')}</h1>
      <div className="h-[calc(100vh-12rem)] rounded-lg overflow-hidden border border-gray-200">
        <BibleGraph />
      </div>
    </div>
  );
} 