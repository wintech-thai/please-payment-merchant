import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { BrandProvider } from '@/context/BrandContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'PLEASE-PAYMENT Merchant',
  description: 'Please Payment Merchant Portal',
  icons: {
    icon: '/img/please-payment.svg',
    shortcut: '/img/please-payment.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var v = localStorage.getItem('brandThemeVars');
            if (v) {
              var vars = JSON.parse(v);
              var root = document.documentElement;
              Object.keys(vars).forEach(function(k){ root.style.setProperty(k, vars[k]); });
            }
          } catch(e) {}
        `}} />
      </head>
      <body>
        <BrandProvider>
          {children}
        </BrandProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            },
          }}
        />
      </body>

    </html>
  )
}
