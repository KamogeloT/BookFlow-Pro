export function BrandLogo({
  className,
  alt = 'Logo',
}: {
  className?: string
  alt?: string
}) {
  // Single-logo mode: use only the image that exists in `web/public/logos/`.
  // Current expected file name:
  // - `web/public/logos/bookflow_logo_1.png`
  return (
    <img
      src="/logos/bookflow_logo_1.png"
      alt={alt}
      className={className ?? 'max-w-full h-auto'}
    />
  )
}

