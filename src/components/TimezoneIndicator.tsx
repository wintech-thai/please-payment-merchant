'use client'

import { Clock } from 'lucide-react'
import { useTimezone } from '@/context/TimezoneContext'
import { useLang } from '@/context/LanguageContext'

interface Props {
  className?: string
  /** 'dark' = white text for the dark navbar strip; 'light' = gray text for
   *  light dropdown panels (e.g. the user menu). */
  variant?: 'dark' | 'light'
}

export function TimezoneIndicator({ className = '', variant = 'dark' }: Props) {
  const { timezone, savedTimezone } = useTimezone()
  const { t } = useLang()
  const isFollowingBrowser = !savedTimezone
  const isLight = variant === 'light'

  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] flex-shrink-0 ${isLight ? 'text-gray-500' : 'text-white'} ${className}`}
      title={isFollowingBrowser ? `${t.profile.timezoneFollowBrowser}: ${timezone}` : `${t.profile.timezoneCustom}: ${timezone}`}
    >
      <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isLight ? 'text-gray-400' : 'opacity-70'}`} />
      <span className={`font-medium whitespace-nowrap ${isLight ? 'text-gray-600' : ''}`}>{timezone}</span>
      {isFollowingBrowser && (
        <span className={`whitespace-nowrap ${isLight ? 'text-gray-400' : 'opacity-60'}`}>({t.profile.timezoneFollowBrowser})</span>
      )}
    </div>
  )
}
