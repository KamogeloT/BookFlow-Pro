import { useNavigate } from 'react-router-dom'

type Props = {
  className?: string
}

/**
 * Pops one entry from the app history (same idea as the browser Back button).
 */
export function AppBackButton({ className }: Props) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      title="Back to previous page"
      aria-label="Back to previous page"
      className={
        className ??
        [
          'inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-gray-200/80 dark:border-gray-700',
          'bg-white/80 dark:bg-[#2c2c2e]/90 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-100',
          'shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800/80 active:opacity-90 transition-colors',
        ].join(' ')
      }
    >
      <span className="text-lg leading-none" aria-hidden>
        ←
      </span>
      <span>Back</span>
    </button>
  )
}
