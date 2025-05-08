"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getArticles, getUserId, isAuthenticated, getUserLikes, toggleArticleLike, isAdmin, deleteArticle, updateArticle } from '@/lib/api';
import { Article } from '@/lib/types';

export default function ArticlePage() {
  const router = useRouter();
  // Get the id parameter from the URL using useParams
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id as string;
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [userAuthenticated, setUserAuthenticated] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [editedKeyPoints, setEditedKeyPoints] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all articles and find the one with matching ID
        const response = await getArticles();
        const foundArticle = response.articles.find(a => a._id === id || a.id === id);
        
        if (foundArticle) {
          setArticle(foundArticle);
        } else {
          setError('Article not found');
        }
      } catch (err) {
        setError('Failed to fetch article. Please try again later.');
        console.error('Error fetching article:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();
    
    // Check if user is authenticated
    setUserAuthenticated(isAuthenticated());
    
    // Check if user is admin
    setIsUserAdmin(isAdmin());
    
  }, [id]);

  // Listen for logout events to update admin status
  useEffect(() => {
    const handleLogout = () => {
      setUserAuthenticated(false);
      setIsUserAdmin(false);
      setIsLiked(false);
    };

    window.addEventListener('userLogout', handleLogout);
    
    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener('userLogout', handleLogout);
    };
  }, []);

  useEffect(() => {
    // Check if article is liked
    const checkIfLiked = async () => {
      if (!userAuthenticated || !article) {
        setIsLiked(false);
        return;
      }
      
      // Start with cached likes from localStorage - this is sufficient in most cases
      const cachedLikes = JSON.parse(localStorage.getItem('likedArticles') || '[]');
      const articleId = article._id || article.id;
      setIsLiked(articleId ? cachedLikes.includes(articleId) : false);
      
      // Only fetch from server on initial load, not on every re-render
      // Using a ref to track if we've already fetched to avoid repeated calls
      const userId = getUserId();
      if (userId && !window.hasOwnProperty('_likesInitiallyFetched')) {
        try {
          // Mark that we've fetched likes at least once in this session
          (window as any)._likesInitiallyFetched = true;
          
          const likes = await getUserLikes(userId);
          // The getUserLikes function now has its own debounce mechanism
          setIsLiked(articleId ? likes.includes(articleId) : false);
        } catch (error) {
          console.error('Error fetching likes:', error);
          // Continue with cached likes if server fetch fails
        }
      }
    };
    
    checkIfLiked();
  }, [article, userAuthenticated]);

  // Initialize edit form when entering edit mode
  useEffect(() => {
    if (isEditing && article) {
      setEditedSummary(article.summarization?.summary || '');
      setEditedKeyPoints(article.summarization?.key_points || []);
    }
  }, [isEditing, article]);

  const handleLike = async () => {
    if (!userAuthenticated) {
      alert('Please log in to like articles');
      return;
    }
    
    if (!article) return;
    
    const articleId = article._id || article.id;
    if (!articleId) {
      console.error('Missing article ID for like operation');
      return;
    }
    
    try {
      setIsLiking(true);
      const result = await toggleArticleLike(articleId);
      setIsLiked(result.isLiked);
    } catch (error) {
      console.error('Error liking article:', error);
      alert('Failed to like article. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };
  
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (!article) return;
    
    const articleId = article._id || article.id;
    if (!articleId) {
      console.error('Missing article ID for delete operation');
      return;
    }
    
    try {
      setIsDeleting(true);
      const result = await deleteArticle(articleId);
      
      if (result.success) {
        // Redirect to home page
        router.push('/');
      } else {
        alert('Failed to delete article: ' + result.message);
      }
    } catch (error: any) {
      console.error('Error deleting article:', error);
      alert('Failed to delete article: ' + (error.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Enter edit mode
  const handleEditClick = () => {
    setIsEditing(true);
  };

  // Cancel editing and discard changes
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedSummary(article?.summarization?.summary || '');
    setEditedKeyPoints(article?.summarization?.key_points || []);
  };

  // Add a new key point when editing
  const handleAddKeyPoint = () => {
    setEditedKeyPoints([...editedKeyPoints, '']);
  };

  // Update a specific key point in the array
  const handleKeyPointChange = (index: number, value: string) => {
    const newKeyPoints = [...editedKeyPoints];
    newKeyPoints[index] = value;
    setEditedKeyPoints(newKeyPoints);
  };

  // Remove a key point
  const handleRemoveKeyPoint = (index: number) => {
    setEditedKeyPoints(editedKeyPoints.filter((_, i) => i !== index));
  };

  // Save changes to the article
  const handleSaveEdit = async () => {
    if (!article) return;
    
    const articleId = article._id || article.id;
    if (!articleId) {
      console.error('Missing article ID for update operation');
      return;
    }
    
    // Remove any empty key points
    const filteredKeyPoints = editedKeyPoints.filter(point => point.trim() !== '');
    
    try {
      setIsUpdating(true);
      const result = await updateArticle(articleId, {
        summary: editedSummary,
        key_points: filteredKeyPoints
      });
      
      if (result.success && result.article) {
        // Update the article in the component state
        setArticle(result.article);
        setIsEditing(false);
      } else {
        alert('Failed to update article: ' + result.message);
      }
    } catch (error: any) {
      console.error('Error updating article:', error);
      alert('Failed to update article: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  // Format date to a readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date unavailable';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get source from author field
  const getSourceFromArticle = (article: Article) => {
    if (!article.author || article.author === "No Author") {
      return "Briefly News";
    }
    return article.author; // Display the full author name
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-12 w-12 border-4 border-gray-900 rounded-full border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <Link 
            href="/"
            className="bg-gray-900 text-white px-4 py-2 rounded font-serif hover:bg-gray-800 transition"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Article not found</div>
          <Link 
            href="/"
            className="bg-gray-900 text-white px-4 py-2 rounded font-serif hover:bg-gray-800 transition"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              ← Back to Articles
            </Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">{article.title}</h1>
          
          {/* Article Tags */}
          {article.summarization?.tags && article.summarization.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {article.summarization.tags.map((tag, index) => {
                // Capitalize first letter of the tag
                const formattedTag = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
                return (
                  <span 
                    key={index} 
                    className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium transition-colors"
                  >
                    #{formattedTag}
                  </span>
                );
              })}
            </div>
          )}
          
          <div className="flex justify-between items-center text-gray-600 text-sm">
            <div className="flex items-center">
              <span className="mr-4">{getSourceFromArticle(article)}</span>
              <span>{article.published_date ? formatDate(article.published_date) : "Date unavailable"}</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-1 ${isLiking ? 'cursor-wait' : 'cursor-pointer'}`}
                disabled={isLiking}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  fill={isLiked ? 'currentColor' : 'none'} 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  className={`${isLiked ? 'text-red-500' : 'text-gray-600'}`}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={isLiked ? 0 : 2} 
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                  />
                </svg>
                <span className="text-sm">{isLiked ? 'Liked' : 'Like'}</span>
              </button>
              
              {isUserAdmin && (
                <>
                  <button 
                    onClick={handleEditClick}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    disabled={isEditing}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="20" 
                      height="20" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                      />
                    </svg>
                    <span className="text-sm">Edit</span>
                  </button>

                  <button 
                    onClick={handleDeleteClick}
                    className="flex items-center gap-1 text-red-600 hover:text-red-800"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="20" 
                      height="20" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                      />
                    </svg>
                    <span className="text-sm">Delete</span>
                  </button>
                </>
              )}
              
              <Link 
                href={article.url} 
                target="_blank" 
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                Read original article
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          {/* Featured Image */}
          <div className="relative h-96 w-full">
            <Image 
              src={article.img || "/api/placeholder/800/400"}
              alt={article.title}
              fill
              className="object-cover"
            />
          </div>
          
          {/* Article Content */}
          <div className="p-6 md:p-8">
            {/* Summary */}
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-bold mb-4">Summary</h2>
              {isEditing ? (
                <textarea
                  value={editedSummary}
                  onChange={e => setEditedSummary(e.target.value)}
                  rows={5}
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter article summary..."
                />
              ) : (
                <p className="text-gray-800 leading-relaxed">{article.summarization?.summary}</p>
              )}
            </div>
            
            {/* Key Points */}
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-bold mb-4">Key Points</h2>
              {isEditing ? (
                <div className="space-y-3">
                  {editedKeyPoints.map((point, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={point}
                        onChange={e => handleKeyPointChange(index, e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter key point..."
                      />
                      <button
                        onClick={() => handleRemoveKeyPoint(index)}
                        className="p-2 text-red-500 hover:text-red-700"
                        title="Remove point"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddKeyPoint}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 mt-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Key Point</span>
                  </button>
                </div>
              ) : (
                <ul className="list-disc pl-5 space-y-2">
                  {article.summarization?.key_points.map((point, index) => (
                    <li key={index} className="text-gray-800">{point}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Edit Action Buttons */}
            {isEditing && (
              <div className="flex justify-end gap-3 mb-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* Call to Action */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-gray-900 text-white px-6 py-3 rounded font-serif hover:bg-gray-800 transition"
              >
                Read Full Article
              </a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-black/30 z-50" onClick={handleCancelDelete}>
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Delete Article</h3>
            <p className="mb-6">Are you sure you want to delete "{article.title}"? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button 
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button 
                className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}