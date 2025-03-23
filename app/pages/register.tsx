'use client';

import { useState } from 'react';
import RegisterForm from '../components/auth/RegisterForm';
import { useTranslation } from '../utils/i18n';

export default function RegisterPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">{t('auth.register')}</h1>
        <RegisterForm />
      </div>
    </div>
  );
} 