"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getArticles, generateArticles, getPersonalizedArticles, getUserId, isAuthenticated } from '@/lib/api';
import { Article } from '@/lib/types';
import ArticleCard from '@/components/ArticleCard';
import Image from 'next/image';

// Update categories to match backend tags
const CATEGORIES = [
  "For You", // New personalized feed
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

// Loading component for Suspense fallback
function NewsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin h-12 w-12 border-4 border-gray-900 rounded-full border-t-transparent"></div>
    </div>
  );
}

// Client component that uses hooks
function HomeContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get('category');
  
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [news, setNews] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState("");
  const [personalizationMessage, setPersonalizationMessage] = useState<string | null>(null);
  const [likeUpdateTrigger, setLikeUpdateTrigger] = useState(0); // To trigger refresh on like changes
  
  // Set the current date on the client side
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));
  }, []);

  // Set selected category from URL parameter
  useEffect(() => {
    if (categoryParam && CATEGORIES.includes(categoryParam)) {
      setSelectedCategory(categoryParam);
    } else if (categoryParam) {
      setSelectedCategory("All"); // Reset to All if invalid category
    }
  }, [categoryParam]);

  // Watch for like changes in localStorage to refresh personalized feed
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const handleLikeChange = (e: StorageEvent) => {
      // Only trigger refresh if on For You tab and user is authenticated
      if (e.key === 'likedArticles' && selectedCategory === "For You" && isAuthenticated()) {
        // Increment the trigger to force a refresh
        setLikeUpdateTrigger(prev => prev + 1);
      }
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleLikeChange);

    return () => {
      window.removeEventListener('storage', handleLikeChange);
    };
  }, [selectedCategory]);
  
  // Set up an interval to check for local like changes (within same tab)
  useEffect(() => {
    if (typeof window === 'undefined' || selectedCategory !== "For You") return;
    
    let prevLikedArticles = localStorage.getItem('likedArticles');
    
    const checkLikeChanges = setInterval(() => {
      const currentLikedArticles = localStorage.getItem('likedArticles');
      if (prevLikedArticles !== currentLikedArticles) {
        prevLikedArticles = currentLikedArticles;
        if (isAuthenticated()) {
          setLikeUpdateTrigger(prev => prev + 1);
        }
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(checkLikeChanges);
  }, [selectedCategory]);

  // Fetch news from API
  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      setError(null);
      setPersonalizationMessage(null);
      
      try {
        let response;
        const userId = getUserId();
        
        if (selectedCategory === "For You") {
          // Check authentication status without logging errors
          const authenticated = isAuthenticated();
          
          // Handle the "For You" personalized feed
          if (authenticated && userId) {
            // Get personalized articles for logged-in users
            try {
              response = await getPersonalizedArticles(userId);
              
              // Display personalization message if we have preferred tags
              if (response.preferred_tags?.length) {
                setPersonalizationMessage(
                  `Articles personalized based on your interests: ${response.preferred_tags.join(', ')}`
                );
              } else {
                // User is logged in but doesn't have preferred tags yet
                setPersonalizationMessage('Like some articles to personalize your feed!');
              }
            } catch (error) {
              console.error('Error fetching personalized articles:', error);
              response = await getArticles();
              setPersonalizationMessage('Could not retrieve personalized articles. Showing default content.');
            }
          } else {
            // User is not logged in, show regular articles with a message
            response = await getArticles();
            setPersonalizationMessage('Log in and like articles to get personalized recommendations!');
          }
        } else {
          // Regular category filtering
          const params = selectedCategory === "All" ? {} : { tags: [selectedCategory] };
          response = await getArticles(params);
        }
        
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
  }, [selectedCategory, likeUpdateTrigger]); // Add likeUpdateTrigger to dependencies

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

  // Format featured article data
  const formatFeaturedArticle = (article: Article) => {
    if (!article) return null;
    
    // Get primary category from tags
    const getPrimaryCategory = () => {
      if (!article.summarization?.tags || article.summarization.tags.length === 0) 
        return 'General';
      return article.summarization.tags[0] || 'General';
    };
    
    // Format date
    const formatDate = () => {
      const date = new Date(article.published_date);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    // Get author/source
    const getSource = () => {
      if (!article.author || article.author === "No Author") {
        return "Briefly News";
      }
      return article.author;
    };
    
    return {
      id: article.id,
      title: article.title,
      summary: article.summarization?.summary || 'No summary available',
      category: getPrimaryCategory(),
      date: formatDate(),
      source: getSource(),
      url: article.url,
      img: article.img
    };
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Add a spacer at the top to ensure content starts below fixed navbar */}
      <div className="h-4"></div>
      
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
      <header className="bg-white border-b border-gray-800 py-6">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-6xl font-serif font-black tracking-tight">BRIEFLY</h1>
          <div className="flex justify-center mt-2">
            <div className="h-1 w-24 bg-black"></div>
          </div>
          <p className="mt-3 text-gray-600 font-serif italic">Your personalized news, expertly curated</p>
        </div>
      </header>

      {/* Category Navigation */}
      <section className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
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

      {/* Main Content */}
      <div className="container mx-auto px-4 mb-12 mt-6">
        {personalizationMessage && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">{personalizationMessage}</p>
              </div>
            </div>
          </div>
        )}
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

            {/* Featured Article - With Image */}
            {news[0] && (
              <div className="mb-8 border-b border-gray-200 pb-8">
                <div className="featured-article relative rounded overflow-hidden">
                  {/* Category Tag */}
                  <div className="absolute top-0 left-0 z-10">
                    <div className="bg-blue-600 text-white px-3 py-1 text-sm font-bold">
                      {formatFeaturedArticle(news[0])?.category}
                    </div>
                  </div>
                  
                  {/* Image Container with Fixed Height */}
                  <div className="relative w-full h-96">
                    <Image 
                      src={news[0].img || "/api/placeholder/800/400"}
                      alt={news[0].title}
                      fill
                      className="object-cover"
                    />
                    
                    {/* Dark Overlay Gradient for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-90"></div>
                    
                    {/* Text Container - Positioned at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white z-10">
                      <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3">
                        {formatFeaturedArticle(news[0])?.title}
                      </h2>
                      
                      <p className="text-white text-opacity-90 mb-4 text-sm md:text-base">
                        {formatFeaturedArticle(news[0])?.summary}
                      </p>
                      
                      <div className="flex justify-between items-center text-white text-opacity-80 text-xs md:text-sm">
                        <span>{formatFeaturedArticle(news[0])?.source}</span>
                        <span>{formatFeaturedArticle(news[0])?.date}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Read Full Article Button */}
                  <a 
                    href={`/article/${news[0]._id}`}
                    className="mt-4 block bg-gray-900 text-white px-4 py-2 text-center hover:bg-gray-800 transition"
                  >
                    Read Article
                  </a>
                </div>
              </div>
            )}

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {news.slice(1).map((article, index) => (
                <ArticleCard 
                  key={article._id ? String(article._id) : `article-${index}`} 
                  article={article} 
                />
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

// Main page component with Suspense boundary
export default function Home() {
  return (
    <Suspense fallback={<NewsLoading />}>
      <HomeContent />
    </Suspense>
  );
}