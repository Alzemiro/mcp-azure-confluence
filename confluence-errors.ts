export class ConfluenceAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ConfluenceAPIError';
  }
}

export class AuthenticationError extends ConfluenceAPIError {
  constructor(message: string = 'Authentication failed. Check your CONFLUENCE_URL, CONFLUENCE_USER, and CONFLUENCE_API_TOKEN environment variables.') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends ConfluenceAPIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}
