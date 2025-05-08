"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getArticles, generateArticles, getPersonalizedArticles, getUserLikedArticles, getUserId, isAuthenticated, getUserLikes, toggleArticleLike } from '@/lib/api';
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
  const searchQuery = searchParams?.get('search') || '';
  
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [news, setNews] = useState<Article[]>([]);
  const [filteredNews, setFilteredNews] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState("");
  const [personalizationMessage, setPersonalizationMessage] = useState<string | null>(null);
  const [likeUpdateTrigger, setLikeUpdateTrigger] = useState(0); // To trigger refresh on like changes
  const [showLikedArticles, setShowLikedArticles] = useState(false); // Toggle between recommendations and liked articles
  const [featuredArticleLiked, setFeaturedArticleLiked] = useState(false); // Track if featured article is liked
  const [isLikingFeatured, setIsLikingFeatured] = useState(false); // Track if like operation is in progress
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
  
  // Force a refresh when switching to the "For You" tab
  useEffect(() => {
    // When user selects the "For You" tab, always refresh content from server
    if (selectedCategory === "For You" && isAuthenticated()) {
      setLikeUpdateTrigger(prev => prev + 1);
    }
  }, [selectedCategory]);
  
  // Add a listener for the custom likeUpdate event
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleCustomLikeUpdate = (e: Event) => {
      // Only refresh if we're in the personalized feed section
      if (selectedCategory === "For You") {
        // Debounce the refresh to avoid multiple rapid updates
        if ((window as any).likeUpdateCustomTimer) {
          clearTimeout((window as any).likeUpdateCustomTimer);
        }
        (window as any).likeUpdateCustomTimer = setTimeout(() => {
          setLikeUpdateTrigger(prev => prev + 1);
        }, 300);
      }
    };
    
    window.addEventListener('likeUpdate', handleCustomLikeUpdate);
    
    return () => {
      window.removeEventListener('likeUpdate', handleCustomLikeUpdate);
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
          // Add debouncing to reduce rapid consecutive refreshes
          if ((window as any).likeUpdateTimer) {
            clearTimeout((window as any).likeUpdateTimer);
          }
          (window as any).likeUpdateTimer = setTimeout(() => {
            setLikeUpdateTrigger(prev => prev + 1);
          }, 300);
        }
      }
    }, 3000); // Increase from 2000ms to 3000ms
    
    return () => clearInterval(checkLikeChanges);
  }, [selectedCategory]);

  // Fetch news from API
  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      setError(null);
      setPersonalizationMessage(null);
      
      console.log('Fetching news - showLikedArticles:', showLikedArticles, 'selectedCategory:', selectedCategory);
      
      try {
        let response;
        const userId = getUserId();
        
        if (selectedCategory === "For You") {
          // Check authentication status without logging errors
          const authenticated = isAuthenticated();
          
          // Handle the "For You" personalized feed
          if (authenticated && userId) {
            if (showLikedArticles) {
              // User wants to see their liked articles
              try {
                console.log('Fetching liked articles for user:', userId);
                response = await getUserLikedArticles(userId);
                
                if (response.articles?.length) {
                  setPersonalizationMessage(
                    `Showing your ${response.articles.length} liked articles`
                  );
                  console.log(`Found ${response.articles.length} liked articles`);
                } else {
                  // Keep user on Liked tab but with a descriptive message
                  setPersonalizationMessage('You haven\'t liked any articles yet. Click the heart icon on articles you enjoy to save them here.');
                  console.log('No liked articles found');
                  // Don't switch back automatically - let user decide when to switch
                }
              } catch (error) {
                console.error('Error fetching liked articles:', error);
                response = await getArticles();
                setPersonalizationMessage('Could not retrieve your liked articles. Showing default content.');
                setShowLikedArticles(false); // Switch back to recommendations if there's an error
              }
            } else {
              // ALWAYS fetch personalized articles directly from the server
              // This ensures we get the most up-to-date preferences regardless of local storage
              try {
                console.log('Fetching personalized articles for user:', userId);
                response = await getPersonalizedArticles(userId);
                
                // Display personalization message based on response data
                if (response.preferred_tags?.length) {
                  // User has preferred tags, show personalized message with the format the user likes
                  setPersonalizationMessage(
                    `Articles personalized based on your interests: ${response.preferred_tags.join(', ')}`
                  );
                  console.log('User has preferred tags:', response.preferred_tags);
                } else if (response.articles?.length) {
                  // We have articles but no preferred tags - use a generic personalization message
                  setPersonalizationMessage(
                    'Articles personalized based on your reading history'
                  );
                  console.log('No preferred tags but articles found');
                } else {
                  // Check if user has any likes in localStorage
                  const likedArticles = localStorage.getItem('likedArticles');
                  const hasLikes = likedArticles && JSON.parse(likedArticles).length > 0;
                  
                  if (hasLikes) {
                    setPersonalizationMessage(
                      'Articles personalized based on your recent activity'
                    );
                    console.log('User has likes but no preferred tags extracted');
                  } else {
                    // User is logged in but doesn't have preferred tags yet
                    setPersonalizationMessage('Like some articles to personalize your feed!');
                    console.log('User has no likes');
                  }
                }
              } catch (error) {
                console.error('Error fetching personalized articles:', error);
                response = await getArticles();
                setPersonalizationMessage('Could not retrieve personalized articles. Showing default content.');
              }
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
  }, [selectedCategory, likeUpdateTrigger, showLikedArticles]); // Include showLikedArticles to trigger refresh on toggle

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
        // Original date string - ensure it's a string before calling toLowerCase
        const originalDate = typeof article.published_date === 'string' 
          ? article.published_date.toLowerCase() 
          : String(article.published_date).toLowerCase();
        
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
    
    // Get article ID, ensuring we handle both MongoDB formats
    const articleId = article._id || article.id;
    
    return {
      id: article.id,
      _id: articleId, // Use whichever ID format is available
      title: article.title,
      summary: article.summarization?.summary || 'No summary available',
      category: getPrimaryCategory(),
      date: formatDate(),
      source: getSource(),
      url: article.url,
      img: article.img
    };
  };

  // Handle like for featured article
  const handleFeaturedLike = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to article page
    e.stopPropagation(); // Prevent event bubbling
    
    if (!userAuthenticated()) {
      alert('Please log in to like articles');
      return;
    }
    
    // Use the filtered article when available (for search results), otherwise use the main news array
    const featuredArticle = filteredNews?.[0] || news?.[0];
    
    // Ensure we have a valid article
    if (!featuredArticle) {
      console.error('No featured article available');
      alert('Please try again. Could not process this article.');
      return;
    }
    
    // Handle both _id and id formats (MongoDB might return either)
    const articleId = featuredArticle._id || featuredArticle.id;
    if (!articleId) {
      console.error('Missing article ID for like operation:', featuredArticle);
      alert('Please try again. Could not process this article.');
      return;
    }
    
    try {
      setIsLikingFeatured(true);
      console.log('Attempting to like featured article with ID:', articleId);
      
      // Use the centralized helper function
      const result = await toggleArticleLike(articleId);
      setFeaturedArticleLiked(result.isLiked);
      
      // Special case for search results - if the search and like happens while
      // in "For You" category with "Liked" tab
      if (selectedCategory === "For You" && showLikedArticles) {
        // Debounce the refresh
        setTimeout(async () => {
          try {
            const userId = getUserId();
            if (userId) {
              const refreshedResponse = await getUserLikedArticles(userId);
              if (refreshedResponse.articles) {
                setNews(refreshedResponse.articles);
                setFilteredNews(refreshedResponse.articles);
              }
            }
          } catch (error) {
            console.error('Error refreshing liked articles:', error);
          }
        }, 300);
      }
    } catch (error) {
      console.error('Error liking featured article:', error);
      alert('Failed to like article. Please try again.');
    } finally {
      setIsLikingFeatured(false);
    }
  };
  
  // Check if user is authenticated
  const userAuthenticated = () => {
    return isAuthenticated();
  };
  
  // Check if featured article is liked
  useEffect(() => {
    // When we're showing filteredNews, check the first filtered article
    // Otherwise fall back to the first article in the news array
    const featuredArticle = filteredNews?.[0] || news?.[0];
    
    if (!featuredArticle || !userAuthenticated()) {
      setFeaturedArticleLiked(false);
      return;
    }
    
    // Handle both _id and id formats
    const articleId = featuredArticle._id || featuredArticle.id;
    if (!articleId) {
      setFeaturedArticleLiked(false);
      return;
    }
    
    // Check cached likes first
    const cachedLikes = JSON.parse(localStorage.getItem('likedArticles') || '[]');
    setFeaturedArticleLiked(cachedLikes.includes(articleId));
    
    // Then fetch from server to ensure we have the latest data
    const userId = getUserId();
    if (userId) {
      getUserLikes(userId)
        .then((likes: string[]) => {
          localStorage.setItem('likedArticles', JSON.stringify(likes));
          setFeaturedArticleLiked(likes.includes(articleId));
        })
        .catch((error: Error) => {
          console.error('Error fetching likes for featured article:', error);
          // Continue with cached likes if server fetch fails
        });
    }
  }, [news, filteredNews, searchQuery]);

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
        {/* Personalization message with toggle switch for For You tab */}
        {personalizationMessage && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r shadow-sm">
            <div className="flex justify-between items-start">
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
              
              {/* Tab buttons for For You tab */}
              {selectedCategory === "For You" && isAuthenticated() && (
                <div className="ml-4">
                  <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button 
                      type="button" 
                      onClick={() => {
                        console.log('Switching to recommended articles');
                        setShowLikedArticles(false);
                        setLikeUpdateTrigger(prev => prev + 1); // Force refresh
                      }}
                      className={`px-4 py-2 text-sm font-medium ${!showLikedArticles 
                        ? 'text-white bg-blue-600 border border-blue-600 rounded-l-lg' 
                        : 'text-blue-600 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100'}`}
                    >
                      For You
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        console.log('Switching to liked articles');
                        setShowLikedArticles(true);
                        setLikeUpdateTrigger(prev => prev + 1); // Force refresh
                      }}
                      className={`px-4 py-2 text-sm font-medium ${showLikedArticles 
                        ? 'text-white bg-blue-600 border border-blue-600 rounded-r-lg' 
                        : 'text-blue-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-r-lg'}`}
                    >
                      Liked
                    </button>
                  </div>
                </div>
              )}
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
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              // No search results case from master branch
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
            ) : selectedCategory === "For You" && showLikedArticles ? (
              // No liked articles case from your branch
              <>
                <div className="mb-6">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-gray-600 text-lg font-medium mb-2">No liked articles yet</p>
                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">When you find articles you enjoy, click the heart icon to save them here for easy reference.</p>
                <button
                  onClick={() => {
                    setShowLikedArticles(false);
                    setLikeUpdateTrigger(prev => prev + 1);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded font-serif hover:bg-blue-700 transition"
                >
                  Browse Recommended Articles
                </button>
              </>
            ) : (
              // No articles in category (default case)
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
                  {selectedCategory === "For You" && showLikedArticles 
                    ? "Liked Articles" 
                    : selectedCategory}
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
                  
                  {/* Like Button */}
                  <button 
                    onClick={handleFeaturedLike}
                    className={`absolute top-4 right-4 z-20 p-2 rounded-full bg-white bg-opacity-80 shadow-md transition ${isLikingFeatured ? 'cursor-wait' : 'cursor-pointer hover:bg-opacity-100'}`}
                    disabled={isLikingFeatured}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="24" 
                      height="24" 
                      fill={featuredArticleLiked ? 'currentColor' : 'none'} 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      className={`${featuredArticleLiked ? 'text-red-500' : 'text-gray-700'}`}
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={featuredArticleLiked ? 0 : 2} 
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                      />
                    </svg>
                  </button>
                  
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
  href={`/article/${filteredNews[0]._id || filteredNews[0].id}`}
  className="mt-4 block bg-gray-900 text-white px-4 py-2 text-center hover:bg-gray-800 transition"
>
                    Read Article
                  </a>
                </div>
              </div>
            )}

            {/* News Grid */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {filteredNews.slice(1).map((article, index) => (
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