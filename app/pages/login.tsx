'use client';

import { useState } from 'react';
import LoginForm from '../components/auth/LoginForm';
import { useTranslation } from '../utils/i18n';

export default function LoginPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">{t('auth.login')}</h1>
        <LoginForm />
      </div>
    </div>
  );
} 