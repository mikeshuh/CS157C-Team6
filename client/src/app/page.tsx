"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getArticles, generateArticles } from '@/lib/api';
import { Article } from '@/lib/types';
import ArticleCard from '@/components/ArticleCard';

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
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  
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

  // Set selected category from URL parameter
  useEffect(() => {
    if (categoryParam && CATEGORIES.includes(categoryParam)) {
      setSelectedCategory(categoryParam);
    } else if (categoryParam) {
      setSelectedCategory("All"); // Reset to All if invalid category
    }
  }, [categoryParam]);

  // Fetch news from API
  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = selectedCategory === "All" ? {} : { tags: [selectedCategory] };
        const response = await getArticles(params);
        // Filter out articles without summarization
        const validArticles = response.articles.filter(article => article.summarization && article.summarization.summary);
        setNews(validArticles);
      } catch (err) {
        setError('Failed to fetch articles. Please try again later.');
        console.error('Error fetching articles:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [selectedCategory]);

  // Handle generating articles
  const handleGenerateArticles = async () => {
    try {
      setIsLoading(true);
      await generateArticles({ q: 'latest news' });
      // Refresh articles after generation
      const response = await getArticles(
        selectedCategory === "All" ? {} : { tags: [selectedCategory] }
      );
      const validArticles = response.articles.filter(article => article.summarization && article.summarization.summary);
      setNews(validArticles);
    } catch (err) {
      console.error('Error generating articles:', err);
      setError('Failed to generate articles. Please try again later.');
    } finally {
      setIsLoading(false);
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
      <section className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-2">
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

      {/* Spacer to account for sticky navigation */}
      <div className="h-4"></div>

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
            <p className="text-sm text-gray-500 mb-6">Try selecting a different category or generate new articles.</p>
            <button 
              onClick={handleGenerateArticles}
              className="bg-gray-900 text-white px-4 py-2 rounded font-serif hover:bg-gray-800 transition"
            >
              Generate Articles
            </button>
          </div>
        ) : (
          <>
            {/* Show category title when a specific category is selected */}
            {selectedCategory !== "All" && (
              <div className="mb-6">
                <h2 className="text-3xl font-serif font-bold border-b border-gray-300 pb-2">
                  {selectedCategory}
                </h2>
              </div>
            )}

            {/* Featured Article - using first article */}
            {news[0] && <ArticleCard article={news[0]} featured={true} />}

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {news.slice(1).map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Generate Articles Button */}
      <div className="fixed bottom-4 right-4">
        <button 
          onClick={handleGenerateArticles}
          className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg font-serif hover:bg-blue-700 transition"
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Articles'}
        </button>
      </div>

      {/* Simple Call to Action */}
      <section className="py-8 bg-gray-100 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-serif font-bold mb-4">Ready to personalize your news?</h2>
          <button 
            onClick={() => window.location.href = "/signup"}
            className="bg-gray-900 text-white px-6 py-2 rounded font-serif hover:bg-gray-800 transition"
          >
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