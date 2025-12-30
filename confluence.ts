import axios, { AxiosInstance, AxiosError } from 'axios';
import { ConfluencePage, ConfluenceSpace, ConfluenceSearchResult, ConfluenceUser } from './confluence-types';
import { AuthenticationError, RateLimitError, ConfluenceAPIError } from './confluence-errors';

// Utility to strip HTML tags for cleaner text output
const stripHtml = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
};

class ConfluenceClient {
  private client: AxiosInstance;
  private confluenceUrl: string;

  constructor() {
    const confluenceUrl = process.env.CONFLUENCE_URL;
    const confluenceUser = process.env.CONFLUENCE_USER;
    const apiToken = process.env.CONFLUENCE_API_TOKEN;

    if (!confluenceUrl || !confluenceUser || !apiToken) {
      throw new Error('Missing required Confluence environment variables: CONFLUENCE_URL, CONFLUENCE_USER, CONFLUENCE_API_TOKEN.');
    }

    // Ensure URL has no trailing slash
    this.confluenceUrl = confluenceUrl.endsWith('/') ? confluenceUrl.slice(0, -1) : confluenceUrl;

    const auth = Buffer.from(`${confluenceUser}:${apiToken}`).toString('base64');

    this.client = axios.create({
      baseURL: `${this.confluenceUrl}/wiki/rest/api`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.setupErrorInterceptor();
  }

  private setupErrorInterceptor() {
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const { status, data } = error.response;
          const errorMessage = (data as any)?.message || (typeof data === 'string' ? data : error.message);

          if (status === 401 || status === 403) {
            throw new AuthenticationError();
          }
          if (status === 429) {
            throw new RateLimitError('Confluence API rate limit exceeded. Please wait a moment.');
          }
          throw new ConfluenceAPIError(`Confluence API Error: ${errorMessage}`, status, data);
        }
        throw new ConfluenceAPIError(`Network or unknown error: ${error.message}`);
      }
    );
  }

  public async getPageContent(pageId: string, expand?: string[]): Promise<ConfluencePage> {
    const response = await this.client.get(`/content/${pageId}`, {
      params: {
        expand: expand?.join(',') || 'body.view,version,space',
      },
    });
    
    const page = response.data as ConfluencePage;
    // Return a cleaned-up version for display
    return {
      ...page,
      body: {
        view: {
          value: stripHtml(page.body?.view?.value || ''),
          representation: 'view'
        }
      }
    };
  }

  public async search(cql: string, limit = 25): Promise<ConfluenceSearchResult> {
    const response = await this.client.get('/content/search', {
      params: { cql, limit },
    });
    return response.data;
  }

  public async listSpaces(limit = 25): Promise<{ results: ConfluenceSpace[] }> {
    const response = await this.client.get('/space', { params: { limit } });
    return response.data;
  }

  public async createPage(spaceKey: string, title: string, content: string, parentId?: string): Promise<ConfluencePage> {
    const pageData = {
      type: 'page',
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: content,
          representation: 'storage',
        },
      },
      ...(parentId && { ancestors: [{ id: parentId }] }),
    };
    const response = await this.client.post('/content', pageData);
    return response.data;
  }

  public async updatePage(pageId: string, title: string, content: string): Promise<ConfluencePage> {
    const currentPage = await this.client.get(`/content/${pageId}?expand=version,space`).then(res => res.data);

    const updateData = {
      id: pageId,
      type: 'page',
      title: title,
      space: { key: currentPage.space.key },
      body: {
        storage: {
          value: content,
          representation: 'storage',
        },
      },
      version: {
        number: currentPage.version.number + 1,
      },
    };
    
    const response = await this.client.put(`/content/${pageId}`, updateData);
    return response.data;
  }
}

// Export a singleton instance of the client
export const confluenceClient = new ConfluenceClient();

