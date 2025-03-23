'use client';

import RegisterForm from '../../components/auth/RegisterForm';
import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const t = useTranslations('auth');

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">{t('register')}</h1>
        <RegisterForm />
      </div>
    </div>
  );
} 