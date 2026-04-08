export interface ConfluencePage {
  id: string;
  type: string;
  title: string;
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
    view?: {
      value: string;
      representation: string;
    };
  };
  version?: {
    number: number;
    when: string;
    by: {
      displayName: string;
      email: string;
    };
  };
  space?: {
    key: string;
    name: string;
  };
  _links?: {
    webui: string;
    self: string;
  };
}

export interface ConfluenceSpace {
  key: string;
  name: string;
  type: string;
  description?: {
    plain?: {
      value: string;
    };
  };
  _links?: {
    webui: string;
    self: string;
  };
}

export interface ConfluenceSearchResult {
  results: ConfluencePage[];
  size: number;
  totalSize: number;
  _links?: {
    next?: string;
    prev?: string;
  };
}

export interface ConfluenceUser {
  accountId: string;
  email: string;
  displayName: string;
  _links?: {
    base: string;
    context: string;
    self: string;
  };
}

export interface CommentVersion {
  createdAt: string;
  message?: string;
  number: number;
  minorEdit: boolean;
  authorId: string;
}

export interface CommentBody {
  storage?: {
    value: string;
    representation: string;
  };
  atlas_doc_format?: {
    value: string;
    representation: string;
  };
}

export interface CommentProperties {
  inlineMarkerRef?: string;
  inlineOriginalSelection?: string;
}

export interface ConfluenceComment {
  id: string;
  status: 'current' | 'deleted' | 'draft';
  title?: string;
  pageId?: string;
  blogPostId?: string;
  version?: CommentVersion;
  body?: CommentBody;
  resolutionStatus?: 'open' | 'resolved' | 'reopened';
  properties?: CommentProperties;
  _links?: {
    webui?: string;
  };
}

export interface CommentListResult {
  results: ConfluenceComment[];
  _links?: {
    next?: string;
    base?: string;
  };
}
