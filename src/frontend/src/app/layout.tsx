import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { Navbar } from '@/components/layout/Navbar';

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
            <main className="flex-1">{children}</main>
            <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500">
              © {new Date().getFullYear()} Whitesparrow Cycling Club
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
