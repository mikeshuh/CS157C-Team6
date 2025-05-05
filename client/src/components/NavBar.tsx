"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { isAuthenticated, logout } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';

export default function NavBar() {
  const [auth, setAuth] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check authentication status on component mount and when pathname changes
    setAuth(isAuthenticated());
  }, [pathname]);

  const handleLogout = () => {
    logout();
    setAuth(false);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 w-full">
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
          
          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            {auth ? (
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-gray-900 font-serif"
              >
                Log out
              </button>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-gray-900 font-serif">
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="bg-gray-900 text-white px-4 py-2 rounded font-serif hover:bg-gray-800 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
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
  );
}