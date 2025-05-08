"use client";

import React, { useState, useEffect, use } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getArticles, getUserId, isAuthenticated, getUserLikes, toggleArticleLike } from '@/lib/api';
import { Article } from '@/lib/types';

export default function ArticlePage() {
  // Get the id parameter from the URL using useParams
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id as string;
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [userAuthenticated, setUserAuthenticated] = useState(false);

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
  }, [id]);

  useEffect(() => {
    // Check if user is authenticated
    const authenticated = isAuthenticated();
    setUserAuthenticated(authenticated);
    
    // Check if article is in user's likes
    const checkIfLiked = async () => {
      if (typeof window !== 'undefined') {
        // First check localStorage (faster)
        const cachedLikes = localStorage.getItem('likedArticles');
        let likedArticles: string[] = cachedLikes ? JSON.parse(cachedLikes) : [];
        
        // If user is authenticated, fetch fresh likes from server
        const userId = getUserId();
        if (authenticated && userId) {
          try {
            // Fetch up-to-date likes from the server
            likedArticles = await getUserLikes(userId);
          } catch (error) {
            console.error('Error fetching likes:', error);
            // Continue with cached likes if server fetch fails
          }
        }
        
        // Get the article ID in a flexible way - handle both MongoDB _id and legacy id
        const articleId = article?._id || article?.id || id;
        setIsLiked(articleId ? likedArticles.includes(articleId) : false);
      }
    };
    
    checkIfLiked();
  }, [article, id, userAuthenticated]);

  const handleLike = async () => {
    if (!userAuthenticated) {
      alert('Please log in to like articles');
      return;
    }

    // Make sure we have a valid article ID before sending the request
    const articleId = article?._id || article?.id || id;
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

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
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
        <div className="flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-gray-900 rounded-full border-t-transparent"></div>
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
    <main className="bg-gray-50 pb-12">
      {/* Article Header */}
      <header className="bg-white border-b border-gray-200 py-6 mb-6">
        <div className="container mx-auto px-4">
          <Link href="/" className="text-gray-600 hover:text-gray-900 mb-4 inline-block">
            ← Back to all articles
          </Link>
          <div className="flex flex-wrap gap-2 mb-2">
            {article.summarization?.tags.map((tag) => (
              <span 
                key={tag} 
                className="bg-gray-200 text-gray-800 px-2 py-1 text-xs font-medium rounded"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-4xl font-serif font-bold mb-3">{article.title}</h1>
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
      <div className="container mx-auto px-4">
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
              <p className="text-gray-800 leading-relaxed">{article.summarization?.summary}</p>
            </div>
            
            {/* Key Points */}
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-bold mb-4">Key Points</h2>
              <ul className="list-disc pl-5 space-y-2">
                {article.summarization?.key_points.map((point, index) => (
                  <li key={index} className="text-gray-800">{point}</li>
                ))}
              </ul>
            </div>

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
    </main>
  );
}