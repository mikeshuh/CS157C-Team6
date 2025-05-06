"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, logout } from '@/lib/api';

// Match categories from page.tsx
const CATEGORIES = [
  "All",
  "World News", 
  "Politics", 
  "Business", 
  "Finance", 
  "Health", 
  "Science", 
  "Entertainment", 
  "Sports", 
  "Technology", 
  "AI", 
  "Cybersecurity", 
  "Gaming", 
  "Travel", 
  "Food", 
  "Lifestyle"
];

export default function NavBar() {
  const [auth, setAuth] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const categoriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check authentication status on component mount and when pathname changes
    setAuth(isAuthenticated());
    
    // Close menus when navigating
    setMobileMenuOpen(false);
    setCategoriesOpen(false);
  }, [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setCategoriesOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
            
            {/* Categories Dropdown */}
            <div className="relative" ref={categoriesRef}>
              <button 
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                className="font-serif hover:text-gray-900 hover:underline flex items-center"
              >
                Categories
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor" 
                  className={`w-4 h-4 ml-1 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`}
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              
              {categoriesOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                  {CATEGORIES.map((category) => (
                    <Link 
                      key={category}
                      href={`/?category=${encodeURIComponent(category)}`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-serif"
                      onClick={() => setCategoriesOpen(false)}
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            <Link href="/about" className="font-serif hover:text-gray-900 hover:underline">About</Link>
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
          <button 
            className="md:hidden" 
            aria-label="Menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-2">
            <Link 
              href="/" 
              className="block py-2 font-serif hover:text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            
            {/* Mobile Categories Dropdown */}
            <div>
              <button 
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                className="w-full text-left py-2 font-serif hover:text-gray-900 flex items-center justify-between"
              >
                Categories
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor" 
                  className={`w-4 h-4 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`}
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              
              {categoriesOpen && (
                <div className="pl-4 border-l-2 border-gray-200 ml-2">
                  {CATEGORIES.map((category) => (
                    <Link 
                      key={category}
                      href={`/?category=${encodeURIComponent(category)}`}
                      className="block py-2 text-sm text-gray-700 hover:text-gray-900 font-serif"
                      onClick={() => {
                        setCategoriesOpen(false);
                        setMobileMenuOpen(false);
                      }}
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            <Link 
              href="/about" 
              className="block py-2 font-serif hover:text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}