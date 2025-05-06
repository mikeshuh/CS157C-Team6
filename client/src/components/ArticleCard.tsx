import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Article } from '@/lib/types';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

export default function ArticleCard({ article, featured = false }: ArticleCardProps) {
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
      <div className="article-featured mb-8 border-b border-gray-200 pb-8 flex flex-col">
        <Link href={`/article/${article.id}`}>
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
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 hover:shadow-md transition">
      <Link href={`/article/${article.id}`} className="block">
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
    </div>
  );
}