import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reply Society Champs Bot',
  description: 'Twitter/X engagement exchange system operated via Telegram',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
