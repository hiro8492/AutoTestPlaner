import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'

import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'QAツール - テスト設計エディタ',
  description: 'テスト設計データの生成・編集・出力ツール',
}

export const viewport: Viewport = {
  themeColor: '#09090b',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased overflow-hidden">
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  )
}
