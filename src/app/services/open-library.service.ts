import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, map, catchError, of } from 'rxjs';
import {
  Book,
  Author,
  OpenLibrarySearchResponse,
  OpenLibraryDoc,
  OpenLibraryWorkResponse,
  PaginatedResponse
} from '../models';

const API_BASE_URL = 'https://openlibrary.org';
const COVERS_BASE_URL = 'https://covers.openlibrary.org';
const DEFAULT_PAGE_SIZE = 20;

@Injectable({
  providedIn: 'root'
})
export class OpenLibraryService {

  constructor(private http: HttpClient) { }

  /**
   * Search books by subject/genre
   */
  searchBySubject(subject: string, page: number = 1, limit: number = DEFAULT_PAGE_SIZE): Observable<PaginatedResponse<Book>> {
    const offset = (page - 1) * limit;

    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<{ works: OpenLibraryDoc[]; work_count: number }>(
      `${API_BASE_URL}/subjects/${subject}.json`,
      { params }
    ).pipe(
      map(response => {
        const books = (response.works || []).map(doc => this.mapDocToBook(doc));
        const totalItems = response.work_count || 0;
        const totalPages = Math.ceil(totalItems / limit);

        return {
          items: books,
          totalItems,
          currentPage: page,
          totalPages,
          hasMore: page < totalPages
        };
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * General search for books
   */
  searchBooks(query: string, page: number = 1, limit: number = DEFAULT_PAGE_SIZE): Observable<PaginatedResponse<Book>> {
    const offset = (page - 1) * limit;

    const params = new HttpParams()
      .set('q', query)
      .set('limit', limit.toString())
      .set('offset', offset.toString())
      .set('fields', 'key,title,author_name,author_key,first_publish_year,cover_i,subject,isbn');

    return this.http.get<OpenLibrarySearchResponse>(
      `${API_BASE_URL}/search.json`,
      { params }
    ).pipe(
      map(response => {
        const books = (response.docs || []).map(doc => this.mapSearchDocToBook(doc));
        const totalItems = response.numFound || 0;
        const totalPages = Math.ceil(totalItems / limit);

        return {
          items: books,
          totalItems,
          currentPage: page,
          totalPages,
          hasMore: page < totalPages
        };
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get book details by work key
   */
  getBookDetails(workKey: string): Observable<Book> {
    // Ensure key starts with /works/
    const key = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;

    return this.http.get<OpenLibraryWorkResponse>(`${API_BASE_URL}${key}.json`).pipe(
      map(response => this.mapWorkResponseToBook(response)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get author details
   */
  getAuthor(authorKey: string): Observable<{ name: string }> {
    const key = authorKey.startsWith('/authors/') ? authorKey : `/authors/${authorKey}`;

    return this.http.get<{ name: string }>(`${API_BASE_URL}${key}.json`).pipe(
      catchError(() => of({ name: 'Unknown Author' }))
    );
  }

  /**
   * Build cover URL from cover ID
   */
  getCoverUrl(coverId: number, size: 'S' | 'M' | 'L' = 'M'): string {
    return `${COVERS_BASE_URL}/b/id/${coverId}-${size}.jpg`;
  }

  /**
   * Map subject document to Book
   */
  private mapDocToBook(doc: any): Book {
    const authors: Author[] = doc.authors?.map((a: any) => ({
      key: a.key,
      name: a.name
    })) || [];

    const coverId = doc.cover_id;
    const coverUrl = coverId ? this.getCoverUrl(coverId) : undefined;

    return {
      key: doc.key,
      title: doc.title,
      authors,
      firstPublishYear: doc.first_publish_year,
      coverId,
      coverUrl,
      subjects: doc.subject
    };
  }

  /**
   * Map search document to Book
   */
  private mapSearchDocToBook(doc: OpenLibraryDoc): Book {
    const authors: Author[] = [];

    if (doc.author_name) {
      doc.author_name.forEach((name, index) => {
        authors.push({
          key: doc.author_key?.[index],
          name
        });
      });
    }

    const coverId = doc.cover_i;
    const coverUrl = coverId ? this.getCoverUrl(coverId) : undefined;

    return {
      key: doc.key,
      title: doc.title,
      authors,
      firstPublishYear: doc.first_publish_year,
      coverId,
      coverUrl,
      subjects: doc.subject,
      isbn: doc.isbn
    };
  }

  /**
   * Map work response to Book with full details
   */
  private mapWorkResponseToBook(response: OpenLibraryWorkResponse): Book {
    let description: string | undefined;

    if (response.description) {
      if (typeof response.description === 'string') {
        description = response.description;
      } else if (response.description.value) {
        description = response.description.value;
      }
    }

    const coverId = response.covers?.[0];
    const coverUrl = coverId ? this.getCoverUrl(coverId, 'L') : undefined;

    return {
      key: response.key,
      title: response.title,
      authors: [], // Will be populated separately if needed
      description,
      coverId,
      coverUrl,
      subjects: response.subjects
    };
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred while fetching data';

    if (error.status === 0) {
      // Network error
      errorMessage = 'Unable to connect. Please check your internet connection.';
    } else if (error.status === 404) {
      errorMessage = 'Resource not found.';
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.status === 429) {
      errorMessage = 'Too many requests. Please wait a moment.';
    }

    console.error('API Error:', error);
    return throwError(() => ({
      message: errorMessage,
      status: error.status,
      originalError: error
    }));
  }
}
