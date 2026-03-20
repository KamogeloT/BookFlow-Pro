import type { ReactNode } from 'react'

const card =
  'rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-[#1c1c1e]/55 backdrop-blur shadow-sm p-6'

export function FeatureShell({
  title,
  description,
  children,
  error,
  onDismissError,
}: {
  title: string
  description?: string
  children?: ReactNode
  error?: string | null
  onDismissError?: () => void
}) {
  return (
    <div className="w-full p-6">
      <div className={card}>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
          {description ? <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p> : null}
        </div>
        {error ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            <span>{error}</span>
            {onDismissError ? (
              <button type="button" className="shrink-0 underline" onClick={onDismissError}>
                Dismiss
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export const featInput =
  'w-full rounded-lg border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-[#2c2c2e] px-3 py-2 text-sm text-gray-900 dark:text-gray-100'

export const featBtnPrimary =
  'rounded-lg bg-purple-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-50'

export const featBtnSecondary =
  'rounded-lg border border-gray-200/80 dark:border-gray-700 px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
