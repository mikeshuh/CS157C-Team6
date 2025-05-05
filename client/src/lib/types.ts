// lib/types.ts
export interface Summarization {
  summary: string;
  key_points: string[];
  tags: string[];
}

export interface Article {
  id: string;
  title: string;
  author: string;
  published_date: string;
  url: string;
  img: string;
  summarization: Summarization;
}

export interface ArticleResponse {
  num_found: number;
  articles: Article[];
}

export interface GenerateArticlesResponse {
  success: boolean;
  created_at: string;
  num_inserted: number;
  num_updated: number;
  num_processed: number;
  num_failed: number;
  articles_processed: Article[];
}

export interface User {
  username: string;
  password: string;
  email?: string;
  role?: string;
  likes?: string[];
}

export interface LoginResponse {
  access_token: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}