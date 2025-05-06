// lib/api.ts
import { ArticleResponse, GenerateArticlesResponse, LoginResponse, User, LikeResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export async function getArticles(params: {
  title?: string;
  tags?: string[];
  author?: string;
  start_date?: string;
  end_date?: string;
} = {}): Promise<ArticleResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.title) searchParams.append('title', params.title);
  if (params.tags?.length) {
    params.tags.forEach(tag => searchParams.append('tags', tag));
  }
  if (params.author) searchParams.append('author', params.author);
  if (params.start_date) searchParams.append('start_date', params.start_date);
  if (params.end_date) searchParams.append('end_date', params.end_date);

  const response = await fetch(`${API_URL}/api/get_articles?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export async function generateArticles(params: {
  q?: string;
  searchIn?: string;
} = {}): Promise<GenerateArticlesResponse> {
  const response = await fetch(`${API_URL}/api/generate_articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function likeArticle(userId: string, articleId: string): Promise<LikeResponse> {
  // Make sure we have a valid user ID  
  if (!userId || userId === 'undefined' || userId.includes('[object')) {
    console.error('Invalid user ID provided:', userId);
    throw new Error('Invalid user ID. Please log in again.');
  }
  
  // Log the data we're sending for debugging
  console.log('Sending like request with:', { userId, articleId });
  
  try {
    // Create the request data
    const requestData = { user_id: userId, article_id: articleId };
    console.log('Request payload:', JSON.stringify(requestData));
    
    const response = await fetch(`${API_URL}/api/like_article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    // Even if response is not ok, get the full error message from the server
    const data = await response.json();
    console.log('Like response:', data);
    
    if (!response.ok) {
      // Include the server's error message if available
      throw new Error(`HTTP error! status: ${response.status}, message: ${data.error || 'Unknown error'}`);
    }

    return data;
  } catch (error) {
    console.error('Error in likeArticle:', error);
    throw error;
  }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function register(user: User): Promise<{ msg: string }> {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Add a function to check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') !== null;
  }
  return false;
}

// Add a function to get the current user's token
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

// Get user ID from localStorage
export function getUserId(): string | null {
  if (typeof window !== 'undefined') {
    const userId = localStorage.getItem('userId');
    
    // Make sure it's a valid string and not an object
    if (userId && typeof userId === 'string' && userId !== 'undefined' && !userId.includes('[object')) {
      return userId;
    } else {
      console.error('Invalid user ID found in localStorage:', userId);
      return null;
    }
  }
  return null;
}

// Add a function to logout
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  }
}