// app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Mock data for demonstration
const MOCK_NEWS = [
  {
    id: 1,
    title: "Global Climate Summit Reaches New Agreements",
    summary: "World leaders have agreed to accelerate emissions reduction targets and increase climate financing for developing nations in a landmark decision.",
    source: "Climate News",
    category: "Environment",
    imageUrl: "/api/placeholder/800/400",
    publishedAt: "2025-03-28T12:30:00Z",
    featured: true
  },
  {
    id: 2,
    title: "Tech Giant Unveils Revolutionary AI Assistant",
    summary: "The new assistant can generate complex content, answer nuanced questions, and understand context at a level previously unseen in consumer AI products.",
    source: "Tech Today",
    category: "Technology",
    imageUrl: "/api/placeholder/800/400",
    publishedAt: "2025-03-29T09:15:00Z"
  },
  {
    id: 3,
    title: "Economic Report Shows Strong Market Resilience",
    summary: "Despite earlier concerns, markets have demonstrated unexpected strength with employment rates rising and inflation continuing to fall.",
    source: "Financial Times",
    category: "Economy",
    imageUrl: "/api/placeholder/800/400",
    publishedAt: "2025-03-29T07:45:00Z"
  },
  {
    id: 4,
    title: "New Medical Breakthrough in Cancer Treatment",
    summary: "Researchers have developed a promising new immunotherapy approach that has shown remarkable results in early clinical trials.",
    source: "Health Journal",
    category: "Health",
    imageUrl: "/api/placeholder/800/400",
    publishedAt: "2025-03-28T16:20:00Z"
  }
];

const CATEGORIES = ["All", "Technology", "Business", "Health", "Science", "Environment", "Economy"];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [news, setNews] = useState(MOCK_NEWS);
  const [isLoading, setIsLoading] = useState(false);
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter news by category
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      if (selectedCategory === "All") {
        setNews(MOCK_NEWS);
      } else {
        setNews(MOCK_NEWS.filter(item => item.category === selectedCategory));
      }
      setIsLoading(false);
    }, 300);
  }, [selectedCategory]);

  // Get featured article
  const featuredArticle = MOCK_NEWS.find(article => article.featured);
  
  // Get regular articles
  const regularArticles = MOCK_NEWS.filter(article => !article.featured);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Newspaper Masthead */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">{currentDate}</div>
            <div className="text-sm text-gray-500">Your Personal News</div>
          </div>
        </div>
      </div>

      {/* Newspaper Title Section */}
      <header className="bg-white border-b border-gray-800 py-6 mb-6">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-6xl font-serif font-black tracking-tight">BRIEFLY</h1>
          <div className="flex justify-center mt-2">
            <div className="h-1 w-24 bg-black"></div>
          </div>
          <p className="mt-3 text-gray-600 font-serif italic">Your personalized news, expertly curated</p>
        </div>
      </header>

      {/* Category Navigation */}
      <section className="bg-white border-y border-gray-200 py-2 sticky top-16 z-10 mb-6">
        <div className="container mx-auto px-4">
          <div className="overflow-x-auto flex gap-2 pb-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1 font-serif whitespace-nowrap font-medium transition
                  ${selectedCategory === category 
                    ? 'bg-gray-900 text-white' 
                    : 'hover:bg-gray-100'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 mb-12">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-gray-900 rounded-full border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Featured Article */}
            {featuredArticle && (
              <div className="mb-8 border-b border-gray-200 pb-8">
                <div className="relative h-80 mb-4">
                  <Image 
                    src={featuredArticle.imageUrl} 
                    alt={featuredArticle.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                    <span className="inline-block bg-blue-600 text-white px-3 py-1 text-sm font-bold mb-2">
                      {featuredArticle.category}
                    </span>
                    <h2 className="text-3xl font-serif font-bold text-white mb-2">{featuredArticle.title}</h2>
                    <p className="text-white text-opacity-90 mb-2">{featuredArticle.summary}</p>
                    <div className="flex justify-between items-center text-white text-opacity-80 text-sm">
                      <span>{featuredArticle.source}</span>
                      <span>{formatDate(featuredArticle.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {regularArticles.map((article) => (
                <div key={article.id} className="bg-white border border-gray-200 hover:shadow-md transition">
                  <div className="relative h-48">
                    <Image 
                      src={article.imageUrl} 
                      alt={article.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-0 left-0 bg-gray-900 text-white px-2 py-1 text-xs font-medium">
                      {article.category}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-serif font-bold text-lg mb-2 line-clamp-2">{article.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">{article.summary}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{article.source}</span>
                      <Link href={`/`} className="font-medium text-gray-900 hover:underline">Read more</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Simple Call to Action */}
      <section className="py-8 bg-gray-100 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-serif font-bold mb-4">Ready to personalize your news?</h2>
          <button className="bg-gray-900 text-white px-6 py-2 rounded font-serif hover:bg-gray-800 transition">
            Sign Up Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-4">
            <h3 className="text-2xl font-serif font-black tracking-tight">BRIEFLY</h3>
          </div>
          <div className="text-center text-sm text-gray-500">
            <p>&copy; 2025 Briefly. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}