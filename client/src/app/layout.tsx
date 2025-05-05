// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';

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
      <body className="bg-gray-50 min-h-screen flex flex-col">
        {/* The NavBar is now a separate client component */}
        <NavBar />
        
        <div className="flex-grow flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}