import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article } from '@/lib/types';
import { getUserId, isAuthenticated, getUserLikes, toggleArticleLike, isAdmin, deleteArticle } from '@/lib/api';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  onDelete?: (articleId: string) => void;
}

export default function ArticleCard({ article, featured = false, onDelete }: ArticleCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [userAuthenticated, setUserAuthenticated] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Ensure we have a proper article._id - MongoDB might return it in different formats
  // In some cases, it might be in article._id or it might be in article.id
  const articleId = article?._id || article?.id;

  useEffect(() => {
    // Check if user is authenticated
    const authenticated = isAuthenticated();
    setUserAuthenticated(authenticated);
    
    // Check if user is admin
    setIsUserAdmin(isAdmin());
    
    const checkIfLiked = async () => {
      // Skip like checks if user is not authenticated
      if (!userAuthenticated) {
        setIsLiked(false);
        return;
      }
      
      // Start with cached likes if available
      const cachedLikes = JSON.parse(localStorage.getItem('likedArticles') || '[]');
      setIsLiked(articleId ? cachedLikes.includes(articleId) : false);
      
      // Then fetch from server to ensure we have the latest data
      const userId = getUserId();
      if (userId) {
        try {
          const likes = await getUserLikes(userId);
          localStorage.setItem('likedArticles', JSON.stringify(likes));
          setIsLiked(articleId ? likes.includes(articleId) : false);
        } catch (error) {
          console.error('Error fetching likes:', error);
          // Continue with cached likes if server fetch fails
        }
      }
    };
    
    checkIfLiked();
  }, [articleId, userAuthenticated]);

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

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to article page
    e.stopPropagation(); // Prevent event bubbling
    
    if (!userAuthenticated) {
      alert('Please log in to like articles');
      return;
    }
    
    if (!articleId) {
      console.error('Missing article ID for like operation:', article);
      alert('Please try again. Could not process this article.');
      return;
    }
    
    try {
      setIsLiking(true);
      console.log('Attempting to like article with ID:', articleId);
      
      // Use the centralized helper function
      const result = await toggleArticleLike(articleId);
      setIsLiked(result.isLiked);
    } catch (error) {
      console.error('Error liking article:', error);
      alert('Failed to like article. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to article page
    e.stopPropagation(); // Prevent event bubbling
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!articleId) {
      console.error('Missing article ID for delete operation:', article);
      return;
    }
    
    try {
      setIsDeleting(true);
      const result = await deleteArticle(articleId);
      
      if (result.success) {
        // Call the onDelete callback if provided
        if (onDelete) {
          onDelete(articleId);
        } else {
          // Fallback: remove the element from DOM
          const articleElement = document.getElementById(`article-${articleId}`);
          if (articleElement) {
            articleElement.remove();
          }
        }
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

  // Get source from author field
  const getSourceFromArticle = (article: Article) => {
    if (!article.author || article.author === "No Author") {
      return "Briefly News";
    }
    return article.author; // Display the full author name
  };

  // Get primary category from tags
  const getPrimaryCategory = (tags: string[] | undefined) => {
    if (!tags || tags.length === 0) return 'General';
    return tags[0] || 'General';
  };

  // Get article summary with fallback
  const getArticleSummary = (article: Article) => {
    return article.summarization?.summary || 'No summary available';
  };

  if (featured) {
    return (
      // Use flex-col to ensure content flows downward
      <div id={`article-${articleId}`} className="article-featured mb-8 border-b border-gray-200 pb-8 flex flex-col relative">
        <Link href={`/article/${articleId}`}>
          <div className="article-container overflow-hidden">
            {/* Technology tag positioned absolutely on top of the image */}
            <div className="absolute top-0 left-0 z-10">
              <div className="bg-blue-600 text-white px-3 py-1 text-sm font-bold">
                {getPrimaryCategory(article.summarization?.tags)}
              </div>
            </div>
            
            <div className="article-title-container pt-10 md:pt-14 bg-gray-700 text-white px-4 md:px-6 py-4 md:py-5">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-white">{article.title}</h2>
            </div>
            
            {/* Article content with dark background */}
            <div className="article-content bg-gray-800 text-white p-4 md:p-6">
              <p className="text-white text-opacity-90 mb-4 text-sm md:text-base">
                {getArticleSummary(article)}
              </p>
              
              <div className="flex justify-between items-center text-white text-opacity-80 text-xs md:text-sm">
                <span>{getSourceFromArticle(article)}</span>
                <span>{formatDate(article.published_date)}</span>
              </div>
            </div>
          </div>
        </Link>
        
        {/* Action buttons stacked vertically on the top right */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <button 
            onClick={handleLike}
            className={`p-2 rounded-full bg-white bg-opacity-80 shadow-md transition ${isLiking ? 'cursor-wait' : 'cursor-pointer hover:bg-opacity-100'}`}
            disabled={isLiking}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              fill={isLiked ? 'currentColor' : 'none'} 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              className={`${isLiked ? 'text-red-500' : 'text-gray-700'}`}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={isLiked ? 0 : 2} 
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
              />
            </svg>
          </button>
          
          {isUserAdmin && (
            <button 
              onClick={handleDeleteClick}
              className="p-2 rounded-full bg-white bg-opacity-80 shadow-md transition hover:bg-opacity-100"
              aria-label="Delete"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                className="text-red-600"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                />
              </svg>
            </button>
          )}
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
      </div>
    );
  }

  return (
    <div id={`article-${articleId}`} className="bg-white border border-gray-200 hover:shadow-md transition relative">
      <Link href={`/article/${articleId}`} className="block">
        <div className="relative h-48">
          <Image 
            src={article.img || "/api/placeholder/800/400"}
            alt={article.title}
            fill
            className="object-cover"
          />
          <div className="absolute top-0 left-0 bg-gray-900 text-white px-2 py-1 text-xs font-medium">
            {getPrimaryCategory(article.summarization?.tags)}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-serif font-bold text-lg mb-2 line-clamp-2">{article.title}</h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-3">{getArticleSummary(article)}</p>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{getSourceFromArticle(article)}</span>
            <span className="font-medium text-gray-900 hover:underline">Read more</span>
          </div>
        </div>
      </Link>
      
      {/* Action buttons stacked vertically on the top right */}
      <div className="absolute top-2 right-2 flex flex-col space-y-2">
        <button 
          onClick={handleLike}
          className={`p-2 rounded-full bg-white bg-opacity-90 shadow-sm transition ${isLiking ? 'cursor-wait' : 'cursor-pointer hover:bg-opacity-100'}`}
          disabled={isLiking}
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            fill={isLiked ? 'currentColor' : 'none'} 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            className={`${isLiked ? 'text-red-500' : 'text-gray-700'}`}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={isLiked ? 0 : 2} 
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
            />
          </svg>
        </button>
        
        {isUserAdmin && (
          <button 
            onClick={handleDeleteClick}
            className="p-2 rounded-full bg-white bg-opacity-90 shadow-sm transition hover:bg-opacity-100"
            aria-label="Delete"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              className="text-red-600"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
              />
            </svg>
          </button>
        )}
      </div>
      
      {/* Delete confirmation dialog with blur effect */}
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
    </div>
  );
}