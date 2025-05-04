// app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getArticles, generateArticles } from '@/lib/api';
import { Article } from '@/lib/types';

// Update categories to match backend tags
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

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [news, setNews] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  // Fetch news from API
  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = selectedCategory === "All" ? {} : { tags: [selectedCategory] };
        const response = await getArticles(params);
        setNews(response.articles);
      } catch (err) {
        setError('Failed to fetch articles. Please try again later.');
        console.error('Error fetching articles:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [selectedCategory]);

  // Get source from author field (simulating)
  const getSourceFromArticle = (article: Article) => {
    if (!article.author || article.author === "No Author") {
      return "Briefly News";
    }
    return article.author.split(' ')[0] + ' News';
  };

  // Get primary category from tags
  const getPrimaryCategory = (tags: string[]) => {
    return tags[0] || 'General';
  };

  // Handle generating articles
  const handleGenerateArticles = async () => {
    try {
      await generateArticles({ q: 'latest news' });
      window.location.reload();
    } catch (err) {
      console.error('Error generating articles:', err);
    }
  };

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
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-gray-900 text-white px-4 py-2 rounded font-serif hover:bg-gray-800 transition"
            >
              Try Again
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No articles found for this category.</p>
            <p className="text-sm text-gray-500">Try selecting a different category or check back later.</p>
          </div>
        ) : (
          <>
            {/* Featured Article - using first article */}
            {news[0] && (
              <div className="mb-8 border-b border-gray-200 pb-8">
                <div className="relative h-80 mb-4">
                  <Image 
                    src="/api/placeholder/800/400"
                    alt={news[0].title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                    <span className="inline-block bg-blue-600 text-white px-3 py-1 text-sm font-bold mb-2">
                      {getPrimaryCategory(news[0].summarization.tags)}
                    </span>
                    <h2 className="text-3xl font-serif font-bold text-white mb-2">{news[0].title}</h2>
                    <p className="text-white text-opacity-90 mb-2">{news[0].summarization.summary}</p>
                    <div className="flex justify-between items-center text-white text-opacity-80 text-sm">
                      <span>{getSourceFromArticle(news[0])}</span>
                      <span>{formatDate(news[0].published_date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {news.slice(1).map((article) => (
                <div key={article.id} className="bg-white border border-gray-200 hover:shadow-md transition">
                  <div className="relative h-48">
                    <Image 
                      src="/api/placeholder/800/400"
                      alt={article.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-0 left-0 bg-gray-900 text-white px-2 py-1 text-xs font-medium">
                      {getPrimaryCategory(article.summarization.tags)}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-serif font-bold text-lg mb-2 line-clamp-2">{article.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">{article.summarization.summary}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{getSourceFromArticle(article)}</span>
                      <Link href={article.url} target="_blank" className="font-medium text-gray-900 hover:underline">Read more</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Generate Articles Button - for development/testing */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4">
          <button 
            onClick={handleGenerateArticles}
            className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg font-serif hover:bg-blue-700 transition"
          >
            Generate Articles
          </button>
        </div>
      )}

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