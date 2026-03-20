import type { ReactNode } from 'react'

/** Small outline icons for the Pro sidebar (Heroicons-style paths, stroke). */

type IconProps = { className?: string }

const defaultCls = 'h-5 w-5 shrink-0 text-gray-600 dark:text-gray-300'

function Svg({ className = defaultCls, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function IconDashboards({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A.75.75 0 016 6.75v4.5A.75.75 0 016 12.75H3.75A.75.75 0 013 12V6.75A.75.75 0 013.75 6zM9.75 6A.75.75 0 0112 6.75v4.5A.75.75 0 0112 12.75H9.75A.75.75 0 019 12V6.75A.75.75 0 019.75 6zM15.75 6A.75.75 0 0118 6.75v4.5A.75.75 0 0118 12.75h-2.25A.75.75 0 0115 12V6.75A.75.75 0 0115.75 6zM3.75 13.5A.75.75 0 016 13.5v4.5a.75.75 0 01-.75.75H3.75A.75.75 0 013 18v-4.5A.75.75 0 013.75 13.5zM9.75 13.5A.75.75 0 0112 13.5v4.5a.75.75 0 01-.75.75H9.75A.75.75 0 019 18v-4.5A.75.75 0 019.75 13.5zM15.75 13.5A.75.75 0 0118 13.5v4.5a.75.75 0 01-.75.75h-2.25A.75.75 0 0115 18v-4.5a.75.75 0 01.75-.75z"
      />
    </Svg>
  )
}

export function IconChart({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </Svg>
  )
}

export function IconUsers({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </Svg>
  )
}

export function IconUser({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </Svg>
  )
}

export function IconPaint({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.53 2.47a.75.75 0 010 1.06L4.75 8.31a.75.75 0 000 1.06l7.22 7.22a.75.75 0 001.06 0l4.78-4.78a.75.75 0 000-1.06l-7.22-7.22a.75.75 0 010-1.06L9.53 2.47zM13.897 11.103a.75.75 0 010 1.06l-3.455 3.455a.75.75 0 01-1.06 0L8.625 10.49h1.275l1.336-1.337a.75.75 0 011.06 0z"
      />
    </Svg>
  )
}

export function IconBuilding({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3h15M5 3v18m15-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
      />
    </Svg>
  )
}

export function IconShield({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </Svg>
  )
}

export function IconCog({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </Svg>
  )
}

export function IconCube({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
      />
    </Svg>
  )
}

export function IconArrowsSwap({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </Svg>
  )
}

export function IconBell({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </Svg>
  )
}

export function IconBolt({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </Svg>
  )
}

export function IconSliders({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
      />
    </Svg>
  )
}

export function IconDocumentSearch({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </Svg>
  )
}

export function IconClock({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </Svg>
  )
}

export function IconQr({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM14.25 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0114.25 9.375v-4.5zM6.75 6.75h.008v.008H6.75V6.75zm0 9.75h.008v.008H6.75v-.008zm9.75-9.75h.008v.008h-.008V6.75zm-3 9.75h.008v.008h-.008v-.008zm3 0h.008v.008h-.008v-.008zm3-3.75h.008v.008h-.008v-.008zm0 3.75h.008v.008h-.008v-.008zM14.25 14.625v4.5M17.25 14.625v4.5M14.25 17.625h4.5"
      />
    </Svg>
  )
}

export function IconTag({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </Svg>
  )
}

export function IconChat({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </Svg>
  )
}

export function IconCode({ className }: IconProps) {
  return (
    <Svg className={className ?? defaultCls}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
      />
    </Svg>
  )
}
