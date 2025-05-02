// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Briefly - Modern News Aggregator',
  description: 'Get AI-powered news summaries tailored to your interests',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Add any additional head elements here */}
      </head>
      <body className="bg-gray-50 min-h-screen flex flex-col">
        {/* Our custom navbar that replaces any default Next.js navbar */}
        <header className="bg-white border-b border-gray-200 w-full top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo/Brand */}
              <Link href="/" className="font-black text-2xl font-serif tracking-tight">
                BRIEFLY
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-6">
                <Link href="/" className="font-serif hover:text-gray-900 hover:underline">Home</Link>
                <Link href="/" className="font-serif hover:text-gray-900 hover:underline">Categories</Link>
                <Link href="/" className="font-serif hover:text-gray-900 hover:underline">About</Link>
              </nav>
              
              {/* Sign Up Button */}
              <div>
                <button className="bg-gray-900 text-white px-4 py-2 rounded font-serif hover:bg-gray-800 transition">
                  Sign Up
                </button>
              </div>
              
              {/* Mobile Menu Button */}
              <button className="md:hidden" aria-label="Menu">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-grow flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}