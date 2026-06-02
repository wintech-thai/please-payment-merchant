'use client'

interface AppVersionDisplayProps {
  className?: string
}

export function AppVersionDisplay({ className = '' }: AppVersionDisplayProps) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION
  const currentYear = new Date().getFullYear()

  return (
    <div className={`flex flex-col items-end justify-center text-right text-[11px] leading-tight text-white ${className}`}>
      <span className="font-medium mb-0.5">
        version: {version}
      </span>
      <span className="opacity-70">
        &copy; {currentYear} All rights reserved.
      </span>
    </div>
  )
}
