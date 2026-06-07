import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SlideKit — 小红书卡片生成器',
  description: '中泰观察局 · 小红书图文卡片自动生成工具',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
