import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Book, PaginatedResponse, CustomList, ListValidationResult, LIST_CONSTANTS } from '../models';
import { DatabaseService } from './database.service';
import { OpenLibraryService } from './open-library.service';
import { NetworkService } from './network.service';

/**
 * BookService - Business logic layer for book operations
 * Implements offline-first strategy
 */
@Injectable({
  providedIn: 'root'
})
export class BookService {
  private readonly PAGE_SIZE = 20;

  constructor(
    private databaseService: DatabaseService,
    private openLibraryService: OpenLibraryService,
    private networkService: NetworkService
  ) { }

  /**
   * Get books by genre with offline-first strategy
   * - Online: Fetch from API and cache to SQLite
   * - Offline: Read from SQLite cache
   */
  async getBooksByGenre(genreId: string, page: number = 1): Promise<PaginatedResponse<Book>> {
    const isOnline = await this.networkService.isOnline();

    if (isOnline) {
      try {
        // Fetch from API
        const response = await firstValueFrom(
          this.openLibraryService.searchBySubject(genreId, page, this.PAGE_SIZE)
        );

        // Cache to SQLite
        const startPosition = (page - 1) * this.PAGE_SIZE;
        await this.databaseService.saveBooksForGenre(genreId, response.items, startPosition);

        return response;
      } catch (error) {
        console.error('Error fetching from API, falling back to cache:', error);
        // Fall back to cache on API error
        return this.getBooksFromCache(genreId, page);
      }
    } else {
      // Offline - read from cache
      return this.getBooksFromCache(genreId, page);
    }
  }

  /**
   * Get books from SQLite cache
   */
  private async getBooksFromCache(genreId: string, page: number): Promise<PaginatedResponse<Book>> {
    const { books, total } = await this.databaseService.getBooksForGenre(genreId, page, this.PAGE_SIZE);
    const totalPages = Math.ceil(total / this.PAGE_SIZE);

    return {
      items: books,
      totalItems: total,
      currentPage: page,
      totalPages,
      hasMore: page < totalPages
    };
  }

  /**
   * Search books with offline support
   */
  async searchBooks(query: string, page: number = 1): Promise<PaginatedResponse<Book>> {
    const isOnline = await this.networkService.isOnline();

    if (isOnline) {
      try {
        const response = await firstValueFrom(
          this.openLibraryService.searchBooks(query, page, this.PAGE_SIZE)
        );

        // Cache books (but not search results mapping)
        await this.databaseService.saveBooks(response.items);

        return response;
      } catch (error) {
        console.error('Search API error, falling back to local search:', error);
        return this.searchBooksLocal(query);
      }
    } else {
      // Offline - search local cache
      return this.searchBooksLocal(query);
    }
  }

  /**
   * Search books in local SQLite cache
   */
  private async searchBooksLocal(query: string): Promise<PaginatedResponse<Book>> {
    const books = await this.databaseService.searchBooksLocal(query);

    return {
      items: books,
      totalItems: books.length,
      currentPage: 1,
      totalPages: 1,
      hasMore: false
    };
  }

  /**
   * Get book details with offline support
   */
  async getBookDetails(workKey: string): Promise<Book | null> {
    const isOnline = await this.networkService.isOnline();

    // First, try local cache
    const cachedBook = await this.databaseService.getBook(workKey);

    if (isOnline) {
      try {
        // Fetch fresh details from API
        const apiBook = await firstValueFrom(
          this.openLibraryService.getBookDetails(workKey)
        );

        // Merge with cached data (keep authors from cache if API doesn't provide them)
        const mergedBook: Book = {
          ...cachedBook,
          ...apiBook,
          authors: apiBook.authors?.length ? apiBook.authors : (cachedBook?.authors || [])
        };

        // Update cache
        await this.databaseService.saveBook(mergedBook);

        return mergedBook;
      } catch (error) {
        console.error('Error fetching book details:', error);
        // Return cached version on error
        return cachedBook;
      }
    } else {
      // Offline - return cached version
      return cachedBook;
    }
  }

  /**
   * Check if there's cached data for a genre
   */
  async hasGenreCache(genreId: string): Promise<boolean> {
    return this.databaseService.hasGenreCache(genreId);
  }

  /**
   * Refresh genre cache
   */
  async refreshGenreCache(genreId: string): Promise<PaginatedResponse<Book>> {
    await this.databaseService.clearGenreCache(genreId);
    return this.getBooksByGenre(genreId, 1);
  }
}

/**
 * CustomListService - Business logic for custom lists management
 */
@Injectable({
  providedIn: 'root'
})
export class CustomListService {

  constructor(private databaseService: DatabaseService) { }

  /**
   * Validate list name
   */
  validateListName(name: string, excludeId?: string): ListValidationResult {
    const trimmedName = name.trim();

    // Check minimum length
    if (trimmedName.length < LIST_CONSTANTS.MIN_NAME_LENGTH) {
      return {
        isValid: false,
        error: `El nombre debe tener al menos ${LIST_CONSTANTS.MIN_NAME_LENGTH} caracteres`
      };
    }

    // Check maximum length
    if (trimmedName.length > LIST_CONSTANTS.MAX_NAME_LENGTH) {
      return {
        isValid: false,
        error: `El nombre no puede exceder ${LIST_CONSTANTS.MAX_NAME_LENGTH} caracteres`
      };
    }

    // Check pattern (valid characters)
    if (!LIST_CONSTANTS.NAME_PATTERN.test(trimmedName)) {
      return {
        isValid: false,
        error: 'El nombre solo puede contener letras, números, espacios y guiones'
      };
    }

    return { isValid: true };
  }

  /**
   * Create a new custom list
   */
  async createList(name: string, description?: string): Promise<{ success: boolean; list?: CustomList; error?: string }> {
    // Validate name
    const validation = this.validateListName(name);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Check max lists limit
    const currentCount = await this.databaseService.getCustomListsCount();
    if (currentCount >= LIST_CONSTANTS.MAX_LISTS) {
      return {
        success: false,
        error: `No puedes crear más de ${LIST_CONSTANTS.MAX_LISTS} listas`
      };
    }

    // Check duplicate name
    const nameExists = await this.databaseService.listNameExists(name);
    if (nameExists) {
      return {
        success: false,
        error: 'Ya existe una lista con ese nombre'
      };
    }

    try {
      const list = await this.databaseService.createCustomList(name, description);
      return { success: true, list };
    } catch (error) {
      console.error('Error creating list:', error);
      return { success: false, error: 'Error al crear la lista' };
    }
  }

  /**
   * Get all custom lists
   */
  async getLists(): Promise<CustomList[]> {
    return this.databaseService.getCustomLists();
  }

  /**
   * Get a specific list by ID
   */
  async getList(listId: string): Promise<CustomList | null> {
    return this.databaseService.getCustomList(listId);
  }

  /**
   * Update list details
   */
  async updateList(listId: string, name: string, description?: string): Promise<{ success: boolean; error?: string }> {
    // Validate name
    const validation = this.validateListName(name, listId);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Check duplicate name (excluding current list)
    const nameExists = await this.databaseService.listNameExists(name, listId);
    if (nameExists) {
      return {
        success: false,
        error: 'Ya existe una lista con ese nombre'
      };
    }

    try {
      await this.databaseService.updateCustomList(listId, name, description);
      return { success: true };
    } catch (error) {
      console.error('Error updating list:', error);
      return { success: false, error: 'Error al actualizar la lista' };
    }
  }

  /**
   * Delete a custom list
   */
  async deleteList(listId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.databaseService.deleteCustomList(listId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting list:', error);
      return { success: false, error: 'Error al eliminar la lista' };
    }
  }

  /**
   * Add book to list
   */
  async addBookToList(listId: string, book: Book): Promise<{ success: boolean; error?: string }> {
    // Check if book already in list
    const isInList = await this.databaseService.isBookInList(listId, book.key);
    if (isInList) {
      return {
        success: false,
        error: 'Este libro ya está en la lista'
      };
    }

    try {
      await this.databaseService.addBookToList(listId, book);
      return { success: true };
    } catch (error) {
      console.error('Error adding book to list:', error);
      return { success: false, error: 'Error al agregar el libro' };
    }
  }

  /**
   * Remove book from list
   */
  async removeBookFromList(listId: string, bookKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.databaseService.removeBookFromList(listId, bookKey);
      return { success: true };
    } catch (error) {
      console.error('Error removing book from list:', error);
      return { success: false, error: 'Error al eliminar el libro' };
    }
  }

  /**
   * Get books in a list
   */
  async getBooksInList(listId: string): Promise<Book[]> {
    return this.databaseService.getBooksInList(listId);
  }

  /**
   * Check if book is in a specific list
   */
  async isBookInList(listId: string, bookKey: string): Promise<boolean> {
    return this.databaseService.isBookInList(listId, bookKey);
  }

  /**
   * Get all lists that contain a book
   */
  async getListsContainingBook(bookKey: string): Promise<CustomList[]> {
    return this.databaseService.getListsContainingBook(bookKey);
  }

  /**
   * Check if can create more lists
   */
  async canCreateMoreLists(): Promise<boolean> {
    const count = await this.databaseService.getCustomListsCount();
    return count < LIST_CONSTANTS.MAX_LISTS;
  }

  /**
   * Get remaining list slots
   */
  async getRemainingListSlots(): Promise<number> {
    const count = await this.databaseService.getCustomListsCount();
    return Math.max(0, LIST_CONSTANTS.MAX_LISTS - count);
  }
}
