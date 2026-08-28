import localFont from 'next/font/local'

export const prompt = localFont({
  src: [
    { path: '../../public/fonts/Prompt-Light.ttf', weight: '300', style: 'normal' },
    { path: '../../public/fonts/Prompt-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Prompt-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../public/fonts/Prompt-Bold.ttf', weight: '600', style: 'normal' },
    { path: '../../public/fonts/Prompt-Bold.ttf', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-prompt',
})
