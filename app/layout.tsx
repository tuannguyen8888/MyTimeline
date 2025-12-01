import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Timeline Mối Quan Hệ - Hồ Sơ Bảo Lãnh Định Cư Mỹ',
  description: 'Ứng dụng quản lý timeline mối quan hệ cho hồ sơ bảo lãnh định cư Mỹ',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}

