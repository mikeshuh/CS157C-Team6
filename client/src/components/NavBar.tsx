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
  const [searchQuery, setSearchQuery] = useState('');
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

  // Update search input when URL parameter changes
  useEffect(() => {
    const url = new URL(window.location.href);
    const searchParam = url.searchParams.get('search') || '';
    setSearchQuery(searchParam);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    setAuth(false);
    router.push('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update URL with search query parameter
    const url = new URL(window.location.href);
    
    // Always redirect to home page for search results
    url.pathname = '/';
    
    if (searchQuery.trim()) {
      url.searchParams.set('search', searchQuery);
    } else {
      url.searchParams.delete('search');
    }
    
    // Preserve category if it exists
    if (url.searchParams.has('category')) {
      const category = url.searchParams.get('category');
      if (category) {
        url.searchParams.set('category', category);
      }
    }
    
    // Use router to navigate to the new URL
    router.push(url.pathname + url.search);
  };

  const clearSearch = () => {
    setSearchQuery('');
    
    // If we're on the home page, update the URL
    if (pathname === '/') {
      const url = new URL(window.location.href);
      url.searchParams.delete('search');
      router.push(url.pathname + url.search);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 w-full">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 items-center h-16">
          {/* Logo and Search - Left Column */}
          <div className="flex items-center">
            <Link href="/" className="font-black text-2xl font-serif tracking-tight">
              BRIEFLY
            </Link>
            
            {/* Search bar - Desktop */}
            <div className="hidden md:flex ml-6">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="py-1 pl-3 pr-10 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800 w-64"
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button 
                  type="submit" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
          
          {/* Center: Desktop Navigation - Middle Column */}
          <nav className="hidden md:flex justify-center space-x-6">
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
          
          {/* Auth Buttons and Mobile Menu - Right Column */}
          <div className="flex items-center justify-end space-x-4">
            {/* Search bar - Mobile */}
            <div className="md:hidden">
              <button 
                onClick={() => {
                  setMobileMenuOpen(!mobileMenuOpen);
                  setCategoriesOpen(false);
                }}
                className="text-gray-700 hover:text-gray-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </button>
            </div>
            
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
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-2">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4 pt-3 relative">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="py-2 px-3 rounded-md border border-gray-300 text-sm w-full focus:outline-none focus:ring-1 focus:ring-gray-800 focus:border-gray-800"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-10 top-1/2 transform -translate-y-1/4 text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button 
                type="submit" 
                className="absolute right-3 top-1/2 transform -translate-y-1/4 text-gray-500 hover:text-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </button>
            </form>
            
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