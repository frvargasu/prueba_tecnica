/**
 * Interface representing a book from Open Library API
 */
export interface Book {
  key: string; // Open Library work key (e.g., "/works/OL123W")
  title: string;
  authors: Author[];
  firstPublishYear?: number;
  coverUrl?: string;
  coverId?: number;
  description?: string;
  subjects?: string[];
  isbn?: string[];
}

/**
 * Author information
 */
export interface Author {
  key?: string;
  name: string;
}

/**
 * API response from Open Library search
 */
export interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  docs: OpenLibraryDoc[];
}

/**
 * Document structure from Open Library search API
 */
export interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  isbn?: string[];
}

/**
 * API response from Open Library works endpoint
 */
export interface OpenLibraryWorkResponse {
  key: string;
  title: string;
  description?: string | { value: string };
  covers?: number[];
  subjects?: string[];
  authors?: { author: { key: string } }[];
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}
