"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getArticles, generateArticles } from '@/lib/api';
import { Article } from '@/lib/types';
import ArticleCard from '@/components/ArticleCard';
import Image from 'next/image';

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
  const searchQuery = searchParams?.get('search') || '';
  
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [news, setNews] = useState<Article[]>([]);
  const [filteredNews, setFilteredNews] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generatedArticles, setGeneratedArticles] = useState<Article[]>([]);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setGenerationComplete(false);
  }
    
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

  // Filter articles based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNews(news);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = news.filter(article => {
      const title = article.title?.toLowerCase() || '';
      const category = article.summarization?.tags?.join(' ').toLowerCase() || '';
      const author = article.author?.toLowerCase() || '';
      
      // Improved date search - handle multiple date formats
      let dateMatches = false;
      if (article.published_date) {
        // Original date string
        const originalDate = article.published_date.toLowerCase();
        
        // Convert to Date object for formatted versions
        const dateObj = new Date(article.published_date);
        
        // Various date formats
        const formats = [
          originalDate,
          dateObj.toLocaleDateString('en-US'), // MM/DD/YYYY
          dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), // MMM DD, YYYY
          dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), // Month DD, YYYY
          dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), // Day, Month DD, YYYY
          dateObj.toLocaleDateString('en-GB'), // DD/MM/YYYY
          dateObj.getFullYear().toString(), // YYYY (just the year)
          dateObj.toLocaleString('en-US', { month: 'short' }).toLowerCase(), // MMM (just the month name)
          dateObj.toLocaleString('en-US', { month: 'long' }).toLowerCase(), // Month (full month name)
        ];
        
        // Check if query matches any of the date formats
        dateMatches = formats.some(format => format.toLowerCase().includes(query));
      }
      
      const summary = article.summarization?.summary?.toLowerCase() || '';
      const keyPoints = article.summarization?.key_points?.join(' ').toLowerCase() || '';
      
      return (
        title.includes(query) ||
        category.includes(query) ||
        author.includes(query) ||
        dateMatches ||
        summary.includes(query) ||
        keyPoints.includes(query)
      );
    });

    setFilteredNews(filtered);
  }, [news, searchQuery]);

const handleGenerateArticles = async () => {
  openModal();
};


const QueryModal = () => {
  const [queryInput, setQueryInput] = useState('');

  const handleModalSubmit = async () => {
    try {
      setIsLoading(true);
      setGenerationComplete(false);
      //console.log('User query:', queryInput);

      // Close the modal
      //closeModal();
      // Use the queryInput from state
      //await generateArticles({ q: queryInput });
      const result = await generateArticles({ q: queryInput });
      console.log(result.articles_processed)
      setGeneratedArticles(result.articles_processed)
      // Refresh articles after generation
      const response = await getArticles(
        selectedCategory === "All" ? {} : { tags: [selectedCategory] }
      );
      const validArticles = response.articles.filter(article => article.summarization && article.summarization.summary);
      setNews(validArticles);
      setGenerationComplete(true);
    } catch (err) {
      console.error('Error generating articles:', err);
      setError('Failed to generate articles. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${!isModalOpen ? 'hidden' : ''}`}>
      <div className="fixed inset-0 bg-gray bg-opacity-70 backdrop-blur-sm"></div>

      {/* Modal content */}
      <div className="relative bg-white p-6 rounded border border-gray-300 shadow-xl w-full max-w-md z-50">
        <h3 className="text-2xl font-serif font-bold mb-6 text-center border-b border-gray-200 pb-3">Generate Articles</h3>

        {!generationComplete ? (
          <>
            {!isLoading && (
              <div className="mb-6">
                <label className="block text-sm font-serif font-medium text-gray-700 mb-2">
                  What news would you like to generate?
                </label>
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded font-serif focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Enter search query"
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={closeModal}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-100 text-gray-800 border border-gray-300 rounded font-serif hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-gray-900 text-white rounded font-serif hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                    <span>Generating...</span>
                  </>
                ) : 'Generate'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-green-600 font-serif text-center mb-6 border-b border-gray-200 pb-4">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-medium">Articles generated successfully!</span>
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto mb-6">
              {generatedArticles.length > 0 && (
                <>
                  <h3 className="text-xl font-serif font-bold mb-4">Generated Articles:</h3>
                  {generatedArticles.map((article) => (
                    <div 
                      key={article.id} 
                      className="p-4 mb-3 border border-gray-200 rounded shadow-sm bg-white hover:border-gray-300 transition"
                    >
                      <p className="font-serif font-medium text-gray-800">{article.title}</p>
                      <p className="text-gray-500 text-xs mt-1">ID: {article.id}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
            
            <div className="flex justify-center mt-6">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-gray-900 text-white rounded font-serif hover:bg-gray-800 transition"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
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
                onClick={() => {
                  // Preserve the search query when changing categories
                  const url = new URL(window.location.href);
                  url.searchParams.set('category', category);
                  if (searchQuery) {
                    url.searchParams.set('search', searchQuery);
                  }
                  window.history.pushState({}, '', url);
                  setSelectedCategory(category);
                }}
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

      {/* Search Query Indicator */}
      {searchQuery && (
        <div className="bg-gray-50 py-3 border-b border-gray-200">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Search results for: <span className="font-medium">{searchQuery}</span>
              </div>
              <button 
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('search');
                  window.location.href = url.toString();
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 mb-12 mt-6">
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
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <p className="text-gray-600 mb-4">No articles match your search for "{searchQuery}".</p>
                <p className="text-sm text-gray-500 mb-6">Try a different search term or category.</p>
                <button 
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('search');
                    window.location.href = url.toString();
                  }}
                  className="bg-gray-900 text-white px-4 py-2 rounded font-serif hover:bg-gray-800 transition"
                >
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">No articles found for this category.</p>
                <p className="text-sm text-gray-500 mb-6">Try selecting a different category or generate new articles.</p>
                <button 
                  onClick={handleGenerateArticles}
                  className="bg-gray-900 text-white px-4 py-2 rounded font-serif hover:bg-gray-800 transition"
                >
                  Generate Articles
                </button>
              </>
            )}
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
            {filteredNews[0] && (
              <div className="mb-8 border-b border-gray-200 pb-8">
                <div className="featured-article relative rounded overflow-hidden">
                  {/* Category Tag */}
                  <div className="absolute top-0 left-0 z-10">
                    <div className="bg-blue-600 text-white px-3 py-1 text-sm font-bold">
                      {formatFeaturedArticle(filteredNews[0])?.category}
                    </div>
                  </div>
                  
                  {/* Image Container with Fixed Height */}
                  <div className="relative w-full h-96">
                    <Image 
                      src={filteredNews[0].img || "/api/placeholder/800/400"}
                      alt={filteredNews[0].title}
                      fill
                      className="object-cover"
                    />
                    
                    {/* Dark Overlay Gradient for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-90"></div>
                    
                    {/* Text Container - Positioned at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
                      <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3">
                        {formatFeaturedArticle(filteredNews[0])?.title}
                      </h2>
                      
                      <p className="text-white text-opacity-90 mb-4 text-sm md:text-base">
                        {formatFeaturedArticle(filteredNews[0])?.summary}
                      </p>
                      
                      <div className="flex justify-between items-center text-white text-opacity-80 text-xs md:text-sm">
                        <span>{formatFeaturedArticle(filteredNews[0])?.source}</span>
                        <span>{formatFeaturedArticle(filteredNews[0])?.date}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Read Full Article Button */}
                  <a 
                    href={`/article/${filteredNews[0].id}`}
                    className="mt-4 block bg-gray-900 text-white px-4 py-2 text-center hover:bg-gray-800 transition"
                  >
                    Read Article
                  </a>
                </div>
              </div>
            )}

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredNews.slice(1).map((article) => (
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
      <QueryModal/>
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