"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getArticles } from '@/lib/api';
import { Article } from '@/lib/types';

export default function ArticlePage() {
  // Use the useParams hook to get the id parameter from the URL
  const params = useParams();
  const id = params?.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all articles and find the one with matching ID
        const response = await getArticles();
        const foundArticle = response.articles.find(a => a.id === id);
        
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
            <Link 
              href={article.url} 
              target="_blank" 
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Read original article
            </Link>
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