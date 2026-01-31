import axios, { AxiosInstance } from 'axios';
import config from '../config';

export interface MoltbookPost {
  id: string;
  title: string;
  content?: string;
  url?: string;
  submolt: string;
  author: {
    id: string;
    name: string;
  };
  upvotes: number;
  downvotes: number;
  comments_count: number;
  created_at: string;
}

export interface MoltbookComment {
  id: string;
  post_id: string;
  content: string;
  author: {
    id: string;
    name: string;
  };
  parent_id?: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

export interface CreatePostParams {
  submolt: string;
  title: string;
  content?: string;
  url?: string;
}

export interface CreateCommentParams {
  post_id: string;
  content: string;
  parent_id?: string;
}

export class MoltbookClient {
  private client: AxiosInstance;
  
  constructor(apiKey?: string) {
    this.client = axios.create({
      baseURL: config.moltbook.baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey || config.moltbook.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }
  
  /**
   * Create a new post
   */
  async createPost(params: CreatePostParams): Promise<MoltbookPost> {
    const response = await this.client.post('/posts', params);
    return response.data.post;
  }
  
  /**
   * Get posts from the feed or a specific submolt
   */
  async getPosts(options: {
    submolt?: string;
    sort?: 'hot' | 'new' | 'top' | 'rising';
    limit?: number;
  } = {}): Promise<MoltbookPost[]> {
    const params = new URLSearchParams();
    if (options.submolt) params.append('submolt', options.submolt);
    if (options.sort) params.append('sort', options.sort);
    if (options.limit) params.append('limit', options.limit.toString());
    
    const response = await this.client.get(`/posts?${params.toString()}`);
    return response.data.posts || [];
  }
  
  /**
   * Get a single post by ID
   */
  async getPost(postId: string): Promise<MoltbookPost> {
    const response = await this.client.get(`/posts/${postId}`);
    return response.data.post;
  }
  
  /**
   * Get comments on a post
   */
  async getComments(postId: string): Promise<MoltbookComment[]> {
    const response = await this.client.get(`/posts/${postId}/comments`);
    return response.data.comments || [];
  }
  
  /**
   * Create a comment
   */
  async createComment(params: CreateCommentParams): Promise<MoltbookComment> {
    const response = await this.client.post(`/posts/${params.post_id}/comments`, {
      content: params.content,
      parent_id: params.parent_id,
    });
    return response.data.comment;
  }
  
  /**
   * Create or get a submolt
   */
  async createSubmolt(name: string, description: string): Promise<any> {
    try {
      const response = await this.client.post('/submolts', { name, description });
      return response.data.submolt;
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Already exists
        return this.getSubmolt(name);
      }
      throw error;
    }
  }
  
  /**
   * Get submolt info
   */
  async getSubmolt(name: string): Promise<any> {
    const response = await this.client.get(`/submolts/${name}`);
    return response.data.submolt;
  }
  
  /**
   * Search posts semantically
   */
  async search(query: string, options: { type?: 'posts' | 'comments' | 'all'; limit?: number } = {}): Promise<any[]> {
    const params = new URLSearchParams({ q: query });
    if (options.type) params.append('type', options.type);
    if (options.limit) params.append('limit', options.limit.toString());
    
    const response = await this.client.get(`/search?${params.toString()}`);
    return response.data.data;
  }
}

export default MoltbookClient;
