'use client';

import LoginForm from '../../components/auth/LoginForm';
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const t = useTranslations('auth');

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">{t('login')}</h1>
        <LoginForm />
      </div>
    </div>
  );
} 