// lib/api.ts
import { ArticleResponse, GenerateArticlesResponse, LoginResponse, User } from './types';

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