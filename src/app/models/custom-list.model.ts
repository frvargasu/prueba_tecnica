import { Book } from './book.model';

/**
 * Custom user-created book list
 */
export interface CustomList {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  bookCount: number;
}

/**
 * Relation between custom list and book
 */
export interface CustomListBook {
  listId: string;
  bookKey: string;
  addedAt: Date;
}

/**
 * Custom list with its books
 */
export interface CustomListWithBooks extends CustomList {
  books: Book[];
}

/**
 * Validation result for custom list operations
 */
export interface ListValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Constants for list validation
 */
export const LIST_CONSTANTS = {
  MAX_LISTS: 3,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,
  NAME_PATTERN: /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-_]+$/
};
