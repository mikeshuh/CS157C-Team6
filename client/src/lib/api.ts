// lib/api.ts
import { ArticleResponse, GenerateArticlesResponse, LoginResponse, User, LikeResponse, Article } from './types';

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

/**
 * Fetch personalized article recommendations for a user based on their likes
 * @param userId The MongoDB ID of the user to get recommendations for
 */
export async function getPersonalizedArticles(userId: string): Promise<ArticleResponse & { preferred_tags?: string[] }> {
  try {
    console.log('Calling personalized articles API with userId:', userId);
    
    // Validate userId
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.error('Invalid userId provided to getPersonalizedArticles:', userId);
      throw new Error('Invalid userId');
    }
    
    const response = await fetch(`${API_URL}/api/personalized_articles/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Personalized articles API response:', {
      success: data.success,
      numArticles: data.articles?.length || 0,
      preferredTags: data.preferred_tags || []
    });
    
    return data;
  } catch (error) {
    console.error('Error fetching personalized articles:', error);
    // If personalization fails, fall back to regular articles
    console.log('Falling back to regular articles');
    return getArticles();
  }
}

/**
 * Fetch the full liked articles for a user (not just IDs)
 * @param userId The MongoDB ID of the user to get liked articles for
 */
export async function getUserLikedArticles(userId: string): Promise<ArticleResponse> {
  try {
    console.log('Fetching liked articles for user:', userId);
    
    // Validate userId
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.error('Invalid userId provided to getUserLikedArticles:', userId);
      throw new Error('Invalid userId');
    }
    
    // Use the new dedicated endpoint to get the user's liked articles with full details
    const response = await fetch(`${API_URL}/api/user/liked_articles/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error fetching liked articles! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Retrieved ${data.articles?.length || 0} liked articles for user ${userId}`);
    
    // Ensure all articles have the MongoDB _id property available
    // (critical for consistency throughout the application)
    if (data.articles) {
      data.articles.forEach((article: Article) => {
        // Make sure we're using the MongoDB _id as per project requirements
        if (!article._id && article.id) {
          console.warn('Article missing _id but has id, fixing this inconsistency');
          article._id = article.id;
        }
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching liked articles:', error);
    return { articles: [], num_found: 0 };
  }
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
  try {
    // Validate inputs
    if (!userId) {
      console.error('likeArticle called with empty userId');
      throw new Error('Missing user_id');
    }
    
    if (!articleId) {
      console.error('likeArticle called with empty articleId');
      throw new Error('Missing article_id');
    }
    
    console.log('likeArticle debug - userId:', userId);
    console.log('likeArticle debug - articleId:', articleId);
    console.log('likeArticle debug - userId type:', typeof userId);
    console.log('likeArticle debug - articleId type:', typeof articleId);
    
    // Make sure we have a valid user ID  
    if (userId === 'undefined' || userId.includes('[object')) {
      console.error('Invalid user ID provided:', userId);
      throw new Error('Invalid user ID. Please log in again.');
    }
    
    // Log the data we're sending for debugging
    console.log('Sending like request with:', { userId, articleId });
    
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

  const loginResponse = await response.json();
  
  // If login response includes likes, store them in localStorage
  if (loginResponse.likes && Array.isArray(loginResponse.likes)) {
    localStorage.setItem('likedArticles', JSON.stringify(loginResponse.likes));
    console.log('Stored likes from login response:', loginResponse.likes);
  }
  
  return loginResponse;
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
      // Only log error if there is a malformed userId (not for null, which is expected when not logged in)
      if (userId && (userId === 'undefined' || userId.includes('[object'))) {
        console.error('Invalid user ID format found in localStorage:', userId);
      }
      return null;
    }
  }
  return null;
}

/**
 * Fetch a user's likes from the server
 */
export async function getUserLikes(userId: string): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/api/user/likes/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && Array.isArray(data.likes)) {
      // Update localStorage with the latest likes
      localStorage.setItem('likedArticles', JSON.stringify(data.likes));
      return data.likes;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching user likes:', error);
    // Return current localStorage likes as fallback
    const currentLikes = localStorage.getItem('likedArticles');
    return currentLikes ? JSON.parse(currentLikes) : [];
  }
}

// Add a function to logout
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('likedArticles'); // Also clear likes on logout
  }
}

/**
 * Helper function to handle the entire article like/unlike process consistently across the app
 * This helps eliminate the duplicate code in different components and ensures consistent behavior
 */
export async function toggleArticleLike(articleId: string): Promise<{ success: boolean, isLiked: boolean }> {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      throw new Error('User not authenticated');
    }
    
    const userId = getUserId();
    if (!userId) {
      throw new Error('User ID not found');
    }
    
    // Get current liked state
    const likedArticles = JSON.parse(localStorage.getItem('likedArticles') || '[]');
    const isCurrentlyLiked = likedArticles.includes(articleId);
    const newLikedState = !isCurrentlyLiked;
    
    // Call the API
    await likeArticle(userId, articleId);
    
    // Update local storage
    if (newLikedState) {
      if (!likedArticles.includes(articleId)) {
        likedArticles.push(articleId);
      }
    } else {
      const index = likedArticles.indexOf(articleId);
      if (index > -1) {
        likedArticles.splice(index, 1);
      }
    }
    localStorage.setItem('likedArticles', JSON.stringify(likedArticles));
    
    // Dispatch a custom event for components to listen to
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('likeUpdate', { 
        detail: { articleId, isLiked: newLikedState } 
      });
      window.dispatchEvent(event);
    }
    
    return { success: true, isLiked: newLikedState };
  } catch (error) {
    console.error('Error toggling article like:', error);
    throw error;
  }
}