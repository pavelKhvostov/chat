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
      <div className="rounded-3xl bg-surface shadow-sh-1 p-8">
        {/* Логотип */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            IntraChat
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Корпоративный мессенджер
          </p>
        </div>

        {/* Форма */}
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm text-ink-900 placeholder-ink-400 outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 transition-colors"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-ink-500 mb-1.5 uppercase tracking-wide"
            >
              Пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm text-ink-900 placeholder-ink-400 outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-coral-500 hover:bg-coral-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-colors shadow-sh-1"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
