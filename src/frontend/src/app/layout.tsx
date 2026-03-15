import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Whitesparrow Cycling Club',
  description: 'Din klub. Din tur. Dit fællesskab.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 pb-16 sm:pb-0">{children}</main>
            <footer className="bg-brand-200/50 py-8 text-center text-sm text-gray-600 mb-16 sm:mb-0">
              © {new Date().getFullYear()} Whitesparrow Cycling Club
            </footer>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
