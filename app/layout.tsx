import type { Metadata, Viewport } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

const notoSansKR = Noto_Sans_KR({ 
  subsets: ["latin"],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-kr'
});

export const metadata: Metadata = {
  title: '직업병 보상지원센터 | 무료 산재 자가진단',
  description: '업무상 질병 산재 지킴이 파로와 함께, 몰라서 못 받는 산재 보상금을 1분 만에 무료로 확인해 보세요.',
  manifest: '/manifest.json?v=8',
  applicationName: '파로스 전산',
  appleWebApp: {
    capable: true,
    title: '파로스 전산',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon-192.png?v=8', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png?v=8', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png?v=8', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: [{ url: '/icon-192.png?v=8', type: 'image/png' }],
  },
  openGraph: {
    title: '직업병 보상지원센터 | 무료 산재 자가진단',
    description: '업무상 질병 산재 지킴이 파로와 함께, 몰라서 못 받는 산재 보상금을 1분 만에 무료로 확인해 보세요.',
    siteName: '노무법인 파로스',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="bg-background">
      <head>
        <link rel="manifest" href="/manifest.json?v=8" />
        <link rel="icon" href="/icon-192.png?v=8" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icon-512.png?v=8" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=8" sizes="180x180" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="파로스 전산" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={`${notoSansKR.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-center" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
