'use client'

import { useState } from 'react'
import { signIn } from '@/lib/actions/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await signIn(formData)
    if (result?.error) {
      setError('Неверный email или пароль')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm px-6">
      <div className="rounded-3xl bg-brand-surface shadow-card p-8">
        {/* Логотип */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-text">
            IntraChat
          </h1>
          <p className="mt-1 text-sm text-brand-text-muted">
            Корпоративный мессенджер
          </p>
        </div>

        {/* Форма */}
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-brand-text-muted mb-1.5 uppercase tracking-wide"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl bg-brand-bg border border-brand-border px-4 py-3 text-sm text-brand-text placeholder-brand-text-subtle outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-brand-text-muted mb-1.5 uppercase tracking-wide"
            >
              Пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl bg-brand-bg border border-brand-border px-4 py-3 text-sm text-brand-text placeholder-brand-text-subtle outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-colors shadow-card"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
