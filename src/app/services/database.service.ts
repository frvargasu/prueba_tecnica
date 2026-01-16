import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
  capSQLiteChanges,
  capSQLiteValues
} from '@capacitor-community/sqlite';
import { Book, Author, CustomList, CustomListBook } from '../models';

const DB_NAME = 'openlibrary_db';

// Keys para localStorage (fallback web)
const STORAGE_KEYS = {
  LISTS: 'openlibrary_lists',
  LIST_BOOKS: 'openlibrary_list_books',
  CACHED_BOOKS: 'openlibrary_cached_books',
  GENRE_BOOKS: 'openlibrary_genre_books'
};

/**
 * SQL statements for creating tables
 */
export const SQL_CREATE_TABLES = `
-- Books table for caching book data
CREATE TABLE IF NOT EXISTS books (
  key TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  first_publish_year INTEGER,
  cover_url TEXT,
  cover_id INTEGER,
  description TEXT,
  subjects TEXT,
  isbn TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Authors table
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT,
  name TEXT NOT NULL,
  UNIQUE(key, name)
);

-- Book-Author relationship
CREATE TABLE IF NOT EXISTS book_authors (
  book_key TEXT NOT NULL,
  author_id INTEGER NOT NULL,
  PRIMARY KEY (book_key, author_id),
  FOREIGN KEY (book_key) REFERENCES books(key) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
);

-- Genre-Book relationship for caching by genre
CREATE TABLE IF NOT EXISTS genre_books (
  genre_id TEXT NOT NULL,
  book_key TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  PRIMARY KEY (genre_id, book_key),
  FOREIGN KEY (book_key) REFERENCES books(key) ON DELETE CASCADE
);

-- Custom lists created by user
CREATE TABLE IF NOT EXISTS custom_lists (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Custom list books relationship
CREATE TABLE IF NOT EXISTS custom_list_books (
  list_id TEXT NOT NULL,
  book_key TEXT NOT NULL,
  added_at INTEGER DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (list_id, book_key),
  FOREIGN KEY (list_id) REFERENCES custom_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (book_key) REFERENCES books(key) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_genre_books_genre ON genre_books(genre_id);
CREATE INDEX IF NOT EXISTS idx_custom_list_books_list ON custom_list_books(list_id);
`;

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;
  private platform: string;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.platform = Capacitor.getPlatform();
  }

  /**
   * Check if running on native platform
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Initialize the database connection and create tables
   * Only works on native platforms (Android/iOS)
   */
  async initializeDatabase(): Promise<void> {
    if (!this.isNative()) {
      console.log('Web platform - SQLite not available');
      return;
    }

    if (this.isInitialized) {
      return;
    }

    try {
      // Check connection consistency
      const retCC = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result;

      if (retCC.result && isConn) {
        this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
      } else {
        this.db = await this.sqlite.createConnection(
          DB_NAME,
          false,
          'no-encryption',
          1,
          false
        );
      }

      await this.db.open();
      await this.createTables();
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Create all necessary tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Split and execute each statement separately
    const statements = SQL_CREATE_TABLES.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await this.db.execute(statement + ';');
    }
  }

  /**
   * Get the database connection
   * Returns null on web platform (no SQLite support)
   */
  private getDb(): SQLiteDBConnection {
    if (!this.db) {
      throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return this.db;
  }

  /**
   * Check if database is available
   */
  private hasDb(): boolean {
    return this.db !== null && this.isInitialized;
  }

  // ==================== LOCAL STORAGE HELPERS (Web Fallback) ====================

  /**
   * Get data from localStorage
   */
  private getFromStorage<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Save data to localStorage
   */
  private saveToStorage<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }

  /**
   * Save to web store (for persistence in web)
   */
  private async saveToWebStore(): Promise<void> {
    if (this.platform === 'web' && this.db) {
      try {
        await this.sqlite.saveToStore(DB_NAME);
      } catch (e) {
        console.error('Error saving to web store:', e);
      }
    }
  }

  // ==================== BOOK OPERATIONS ====================

  /**
   * Save a book to the database
   */
  async saveBook(book: Book): Promise<void> {
    if (!this.hasDb()) {
      // Fallback: guardar en localStorage
      const cachedBooks = this.getFromStorage<{[key: string]: Book}>(STORAGE_KEYS.CACHED_BOOKS, {});
      cachedBooks[book.key] = book;
      this.saveToStorage(STORAGE_KEYS.CACHED_BOOKS, cachedBooks);
      return;
    }
    const db = this.getDb();
    
    const sql = `
      INSERT OR REPLACE INTO books (key, title, first_publish_year, cover_url, cover_id, description, subjects, isbn, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    `;
    
    await db.run(sql, [
      book.key,
      book.title,
      book.firstPublishYear || null,
      book.coverUrl || null,
      book.coverId || null,
      book.description || null,
      book.subjects ? JSON.stringify(book.subjects) : null,
      book.isbn ? JSON.stringify(book.isbn) : null
    ]);

    // Save authors
    if (book.authors && book.authors.length > 0) {
      await this.saveBookAuthors(book.key, book.authors);
    }
  }

  /**
   * Save multiple books at once
   */
  async saveBooks(books: Book[]): Promise<void> {
    for (const book of books) {
      await this.saveBook(book);
    }
  }

  /**
   * Save book authors
   */
  private async saveBookAuthors(bookKey: string, authors: Author[]): Promise<void> {
    if (!this.hasDb()) return;
    const db = this.getDb();

    // Delete existing author relationships for this book
    await db.run('DELETE FROM book_authors WHERE book_key = ?', [bookKey]);

    for (const author of authors) {
      // Insert or get author
      const authorSql = `
        INSERT OR IGNORE INTO authors (key, name) VALUES (?, ?)
      `;
      await db.run(authorSql, [author.key || null, author.name]);

      // Get author id
      const result = await db.query(
        'SELECT id FROM authors WHERE name = ? AND (key = ? OR (key IS NULL AND ? IS NULL))',
        [author.name, author.key || null, author.key || null]
      );

      if (result.values && result.values.length > 0) {
        const authorId = result.values[0].id;
        await db.run(
          'INSERT OR IGNORE INTO book_authors (book_key, author_id) VALUES (?, ?)',
          [bookKey, authorId]
        );
      }
    }
  }

  /**
   * Get a book by key
   */
  async getBook(key: string): Promise<Book | null> {
    if (!this.hasDb()) {
      // Fallback: buscar en localStorage
      const cachedBooks = this.getFromStorage<{[key: string]: Book}>(STORAGE_KEYS.CACHED_BOOKS, {});
      return cachedBooks[key] || null;
    }
    const db = this.getDb();

    const result = await db.query('SELECT * FROM books WHERE key = ?', [key]);

    if (!result.values || result.values.length === 0) {
      return null;
    }

    const row = result.values[0];
    return this.mapRowToBook(row);
  }

  /**
   * Get book authors
   */
  private async getBookAuthors(bookKey: string): Promise<Author[]> {
    if (!this.hasDb()) return [];
    const db = this.getDb();

    const result = await db.query(
      `SELECT a.key, a.name 
       FROM authors a 
       JOIN book_authors ba ON a.id = ba.author_id 
       WHERE ba.book_key = ?`,
      [bookKey]
    );

    if (!result.values) return [];

    return result.values.map(row => ({
      key: row.key || undefined,
      name: row.name
    }));
  }

  /**
   * Map database row to Book object
   */
  private async mapRowToBook(row: any): Promise<Book> {
    const authors = await this.getBookAuthors(row.key);
    
    return {
      key: row.key,
      title: row.title,
      authors,
      firstPublishYear: row.first_publish_year || undefined,
      coverUrl: row.cover_url || undefined,
      coverId: row.cover_id || undefined,
      description: row.description || undefined,
      subjects: row.subjects ? JSON.parse(row.subjects) : undefined,
      isbn: row.isbn ? JSON.parse(row.isbn) : undefined
    };
  }

  // ==================== GENRE BOOK CACHE ====================

  /**
   * Save books for a genre (cache)
   */
  async saveBooksForGenre(genreId: string, books: Book[], startPosition: number = 0): Promise<void> {
    if (!this.hasDb()) {
      // Fallback: guardar en localStorage
      const genreBooks = this.getFromStorage<{[id: string]: Book[]}>(STORAGE_KEYS.GENRE_BOOKS, {});
      if (!genreBooks[genreId]) genreBooks[genreId] = [];
      // Agregar libros sin duplicados
      for (const book of books) {
        if (!genreBooks[genreId].find(b => b.key === book.key)) {
          genreBooks[genreId].push(book);
        }
      }
      this.saveToStorage(STORAGE_KEYS.GENRE_BOOKS, genreBooks);
      // También guardar en cache de libros
      const cachedBooks = this.getFromStorage<{[key: string]: Book}>(STORAGE_KEYS.CACHED_BOOKS, {});
      for (const book of books) {
        cachedBooks[book.key] = book;
      }
      this.saveToStorage(STORAGE_KEYS.CACHED_BOOKS, cachedBooks);
      return;
    }

    const db = this.getDb();

    // Save all books first
    await this.saveBooks(books);

    // Link books to genre
    for (let i = 0; i < books.length; i++) {
      await db.run(
        'INSERT OR REPLACE INTO genre_books (genre_id, book_key, position) VALUES (?, ?, ?)',
        [genreId, books[i].key, startPosition + i]
      );
    }

    await this.saveToWebStore();
  }

  /**
   * Get cached books for a genre
   */
  async getBooksForGenre(genreId: string, page: number = 1, limit: number = 20): Promise<{ books: Book[]; total: number }> {
    if (!this.hasDb()) {
      // Fallback: obtener de localStorage
      const genreBooks = this.getFromStorage<{[id: string]: Book[]}>(STORAGE_KEYS.GENRE_BOOKS, {});
      const allBooks = genreBooks[genreId] || [];
      const offset = (page - 1) * limit;
      const books = allBooks.slice(offset, offset + limit);
      return { books, total: allBooks.length };
    }

    const db = this.getDb();
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM genre_books WHERE genre_id = ?',
      [genreId]
    );
    const total = countResult.values?.[0]?.total || 0;

    // Get books
    const result = await db.query(
      `SELECT b.* FROM books b
       JOIN genre_books gb ON b.key = gb.book_key
       WHERE gb.genre_id = ?
       ORDER BY gb.position
       LIMIT ? OFFSET ?`,
      [genreId, limit, offset]
    );

    const books: Book[] = [];
    if (result.values) {
      for (const row of result.values) {
        books.push(await this.mapRowToBook(row));
      }
    }

    return { books, total };
  }

  /**
   * Check if genre has cached books
   */
  async hasGenreCache(genreId: string): Promise<boolean> {
    if (!this.hasDb()) {
      // Fallback: verificar en localStorage
      const genreBooks = this.getFromStorage<{[id: string]: Book[]}>(STORAGE_KEYS.GENRE_BOOKS, {});
      return (genreBooks[genreId]?.length || 0) > 0;
    }

    const db = this.getDb();
    const result = await db.query(
      'SELECT COUNT(*) as count FROM genre_books WHERE genre_id = ?',
      [genreId]
    );
    return (result.values?.[0]?.count || 0) > 0;
  }

  /**
   * Clear genre cache
   */
  async clearGenreCache(genreId: string): Promise<void> {
    if (!this.hasDb()) return;

    const db = this.getDb();
    await db.run('DELETE FROM genre_books WHERE genre_id = ?', [genreId]);
    await this.saveToWebStore();
  }

  // ==================== CUSTOM LIST OPERATIONS ====================

  /**
   * Create a custom list
   */
  async createCustomList(name: string, description?: string): Promise<CustomList> {
    const id = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newList: CustomList = {
      id,
      name: name.trim(),
      description: description?.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      bookCount: 0
    };
    
    if (!this.hasDb()) {
      // Fallback: guardar en localStorage
      const lists = this.getFromStorage<CustomList[]>(STORAGE_KEYS.LISTS, []);
      lists.push(newList);
      this.saveToStorage(STORAGE_KEYS.LISTS, lists);
      return newList;
    }
    
    const db = this.getDb();
    await db.run(
      'INSERT INTO custom_lists (id, name, description) VALUES (?, ?, ?)',
      [id, name.trim(), description?.trim() || null]
    );
    
    await this.saveToWebStore();
    return newList;
  }

  /**
   * Get all custom lists
   */
  async getCustomLists(): Promise<CustomList[]> {
    if (!this.hasDb()) {
      // Fallback: obtener de localStorage
      const lists = this.getFromStorage<CustomList[]>(STORAGE_KEYS.LISTS, []);
      const listBooks = this.getFromStorage<{[id: string]: string[]}>(STORAGE_KEYS.LIST_BOOKS, {});
      return lists.map(list => ({
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt),
        bookCount: (listBooks[list.id] || []).length
      }));
    }

    const db = this.getDb();

    const result = await db.query(`
      SELECT cl.*, COUNT(clb.book_key) as book_count
      FROM custom_lists cl
      LEFT JOIN custom_list_books clb ON cl.id = clb.list_id
      GROUP BY cl.id
      ORDER BY cl.created_at DESC
    `);

    if (!result.values) return [];

    return result.values.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
      bookCount: row.book_count || 0
    }));
  }

  /**
   * Get custom list by ID
   */
  async getCustomList(listId: string): Promise<CustomList | null> {
    if (!this.hasDb()) {
      // Fallback: obtener de localStorage
      const lists = this.getFromStorage<CustomList[]>(STORAGE_KEYS.LISTS, []);
      const listBooks = this.getFromStorage<{[id: string]: string[]}>(STORAGE_KEYS.LIST_BOOKS, {});
      const list = lists.find(l => l.id === listId);
      if (!list) return null;
      return {
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt),
        bookCount: (listBooks[list.id] || []).length
      };
    }

    const db = this.getDb();

    const result = await db.query(`
      SELECT cl.*, COUNT(clb.book_key) as book_count
      FROM custom_lists cl
      LEFT JOIN custom_list_books clb ON cl.id = clb.list_id
      WHERE cl.id = ?
      GROUP BY cl.id
    `, [listId]);

    if (!result.values || result.values.length === 0) return null;

    const row = result.values[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
      bookCount: row.book_count || 0
    };
  }

  /**
   * Get custom lists count
   */
  async getCustomListsCount(): Promise<number> {
    if (!this.hasDb()) {
      // Fallback: obtener de localStorage
      const lists = this.getFromStorage<CustomList[]>(STORAGE_KEYS.LISTS, []);
      return lists.length;
    }

    const db = this.getDb();
    const result = await db.query('SELECT COUNT(*) as count FROM custom_lists');
    return result.values?.[0]?.count || 0;
  }

  /**
   * Check if list name exists
   */
  async listNameExists(name: string, excludeId?: string): Promise<boolean> {
    if (!this.hasDb()) {
      // Fallback: verificar en localStorage
      const lists = this.getFromStorage<CustomList[]>(STORAGE_KEYS.LISTS, []);
      const normalizedName = name.trim().toLowerCase();
      return lists.some(l => 
        l.name.toLowerCase() === normalizedName && 
        (!excludeId || l.id !== excludeId)
      );
    }

    const db = this.getDb();
    const normalizedName = name.trim().toLowerCase();
    
    let sql = 'SELECT COUNT(*) as count FROM custom_lists WHERE LOWER(TRIM(name)) = ?';
    const params: any[] = [normalizedName];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await db.query(sql, params);
    return (result.values?.[0]?.count || 0) > 0;
  }

  /**
   * Update custom list
   */
  async updateCustomList(listId: string, name: string, description?: string): Promise<void> {
    if (!this.hasDb()) {
      // Fallback: actualizar en localStorage
      const lists = this.getFromStorage<CustomList[]>(STORAGE_KEYS.LISTS, []);
      const index = lists.findIndex(l => l.id === listId);
      if (index !== -1) {
        lists[index].name = name.trim();
        lists[index].description = description?.trim();
        lists[index].updatedAt = new Date();
        this.saveToStorage(STORAGE_KEYS.LISTS, lists);
      }
      return;
    }

    const db = this.getDb();

    await db.run(
      `UPDATE custom_lists 
       SET name = ?, description = ?, updated_at = strftime('%s', 'now')
       WHERE id = ?`,
      [name.trim(), description?.trim() || null, listId]
    );
    
    await this.saveToWebStore();
  }

  /**
   * Delete custom list
   */
  async deleteCustomList(listId: string): Promise<void> {
    if (!this.hasDb()) {
      // Fallback: eliminar de localStorage
      const lists = this.getFromStorage<CustomList[]>(STORAGE_KEYS.LISTS, []);
      const filtered = lists.filter(l => l.id !== listId);
      this.saveToStorage(STORAGE_KEYS.LISTS, filtered);
      // Eliminar libros de la lista
      const listBooks = this.getFromStorage<{[id: string]: string[]}>(STORAGE_KEYS.LIST_BOOKS, {});
      delete listBooks[listId];
      this.saveToStorage(STORAGE_KEYS.LIST_BOOKS, listBooks);
      return;
    }

    const db = this.getDb();
    await db.run('DELETE FROM custom_lists WHERE id = ?', [listId]);
    await this.saveToWebStore();
  }

  /**
   * Add book to custom list
   */
  async addBookToList(listId: string, book: Book): Promise<void> {
    if (!this.hasDb()) {
      // Fallback: agregar en localStorage
      const cachedBooks = this.getFromStorage<{[key: string]: Book}>(STORAGE_KEYS.CACHED_BOOKS, {});
      cachedBooks[book.key] = book;
      this.saveToStorage(STORAGE_KEYS.CACHED_BOOKS, cachedBooks);
      
      const listBooks = this.getFromStorage<{[id: string]: string[]}>(STORAGE_KEYS.LIST_BOOKS, {});
      if (!listBooks[listId]) listBooks[listId] = [];
      if (!listBooks[listId].includes(book.key)) {
        listBooks[listId].push(book.key);
      }
      this.saveToStorage(STORAGE_KEYS.LIST_BOOKS, listBooks);
      return;
    }
    const db = this.getDb();

    // Save book if not exists
    await this.saveBook(book);

    // Add to list
    await db.run(
      'INSERT OR IGNORE INTO custom_list_books (list_id, book_key) VALUES (?, ?)',
      [listId, book.key]
    );

    // Update list timestamp
    await db.run(
      `UPDATE custom_lists SET updated_at = strftime('%s', 'now') WHERE id = ?`,
      [listId]
    );
  }

  /**
   * Remove book from custom list
   */
  async removeBookFromList(listId: string, bookKey: string): Promise<void> {
    if (!this.hasDb()) {
      // Fallback: eliminar de localStorage
      const listBooks = this.getFromStorage<{[id: string]: string[]}>(STORAGE_KEYS.LIST_BOOKS, {});
      if (listBooks[listId]) {
        listBooks[listId] = listBooks[listId].filter(k => k !== bookKey);
        this.saveToStorage(STORAGE_KEYS.LIST_BOOKS, listBooks);
      }
      return;
    }
    const db = this.getDb();

    await db.run(
      'DELETE FROM custom_list_books WHERE list_id = ? AND book_key = ?',
      [listId, bookKey]
    );

    // Update list timestamp
    await db.run(
      `UPDATE custom_lists SET updated_at = strftime('%s', 'now') WHERE id = ?`,
      [listId]
    );
  }

  /**
   * Check if book is in list
   */
  async isBookInList(listId: string, bookKey: string): Promise<boolean> {
    if (!this.hasDb()) {
      // Fallback: verificar en localStorage
      const listBooks = this.getFromStorage<{[id: string]: string[]}>(STORAGE_KEYS.LIST_BOOKS, {});
      return (listBooks[listId] || []).includes(bookKey);
    }
    const db = this.getDb();

    const result = await db.query(
      'SELECT COUNT(*) as count FROM custom_list_books WHERE list_id = ? AND book_key = ?',
      [listId, bookKey]
    );

    return (result.values?.[0]?.count || 0) > 0;
  }

  /**
   * Get books in custom list
   */
  async getBooksInList(listId: string): Promise<Book[]> {
    if (!this.hasDb()) {
      // Fallback: obtener de localStorage
      const listBooks = this.getFromStorage<{[id: string]: string[]}>(STORAGE_KEYS.LIST_BOOKS, {});
      const cachedBooks = this.getFromStorage<{[key: string]: Book}>(STORAGE_KEYS.CACHED_BOOKS, {});
      const bookKeys = listBooks[listId] || [];
      return bookKeys.map(key => cachedBooks[key]).filter(Boolean);
    }
    const db = this.getDb();

    const result = await db.query(
      `SELECT b.* FROM books b
       JOIN custom_list_books clb ON b.key = clb.book_key
       WHERE clb.list_id = ?
       ORDER BY clb.added_at DESC`,
      [listId]
    );

    const books: Book[] = [];
    if (result.values) {
      for (const row of result.values) {
        books.push(await this.mapRowToBook(row));
      }
    }

    return books;
  }

  /**
   * Get lists containing a specific book
   */
  async getListsContainingBook(bookKey: string): Promise<CustomList[]> {
    if (!this.hasDb()) {
      // Fallback: buscar en localStorage
      const lists = this.getFromStorage<CustomList[]>(STORAGE_KEYS.LISTS, []);
      const listBooks = this.getFromStorage<{[id: string]: string[]}>(STORAGE_KEYS.LIST_BOOKS, {});
      return lists.filter(list => (listBooks[list.id] || []).includes(bookKey)).map(list => ({
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt),
        bookCount: (listBooks[list.id] || []).length
      }));
    }
    const db = this.getDb();

    const result = await db.query(`
      SELECT cl.*, COUNT(clb2.book_key) as book_count
      FROM custom_lists cl
      JOIN custom_list_books clb ON cl.id = clb.list_id
      LEFT JOIN custom_list_books clb2 ON cl.id = clb2.list_id
      WHERE clb.book_key = ?
      GROUP BY cl.id
    `, [bookKey]);

    if (!result.values) return [];

    return result.values.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
      bookCount: row.book_count || 0
    }));
  }

  // ==================== SEARCH CACHE ====================

  /**
   * Search books in local cache
   */
  async searchBooksLocal(query: string, limit: number = 20): Promise<Book[]> {
    if (!this.hasDb()) return [];
    const db = this.getDb();
    const searchTerm = `%${query.toLowerCase()}%`;

    const result = await db.query(
      `SELECT DISTINCT b.* FROM books b
       LEFT JOIN book_authors ba ON b.key = ba.book_key
       LEFT JOIN authors a ON ba.author_id = a.id
       WHERE LOWER(b.title) LIKE ? OR LOWER(a.name) LIKE ?
       LIMIT ?`,
      [searchTerm, searchTerm, limit]
    );

    const books: Book[] = [];
    if (result.values) {
      for (const row of result.values) {
        books.push(await this.mapRowToBook(row));
      }
    }

    return books;
  }

  /**
   * Close database connection
   */
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}
