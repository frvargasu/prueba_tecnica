-- ============================================
-- Open Library App - Database Schema
-- SQLite Database for Capacitor
-- ============================================

-- ============================================
-- BOOKS TABLE
-- Stores cached book data from Open Library API
-- ============================================
CREATE TABLE IF NOT EXISTS books (
    key TEXT PRIMARY KEY NOT NULL,           -- Open Library work key (e.g., "/works/OL123W")
    title TEXT NOT NULL,                      -- Book title
    first_publish_year INTEGER,               -- First publication year
    cover_url TEXT,                           -- Full URL to cover image
    cover_id INTEGER,                         -- Open Library cover ID
    description TEXT,                         -- Book description
    subjects TEXT,                            -- JSON array of subjects
    isbn TEXT,                                -- JSON array of ISBN numbers
    created_at INTEGER DEFAULT (strftime('%s', 'now')),  -- Creation timestamp
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))   -- Last update timestamp
);

-- ============================================
-- AUTHORS TABLE
-- Stores author information
-- ============================================
CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT,                                 -- Open Library author key
    name TEXT NOT NULL,                       -- Author name
    UNIQUE(key, name)                         -- Prevent duplicate authors
);

-- ============================================
-- BOOK_AUTHORS TABLE
-- Many-to-many relationship between books and authors
-- ============================================
CREATE TABLE IF NOT EXISTS book_authors (
    book_key TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    PRIMARY KEY (book_key, author_id),
    FOREIGN KEY (book_key) REFERENCES books(key) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
);

-- ============================================
-- GENRE_BOOKS TABLE
-- Cache relationship between genres and books
-- Used for offline access to genre listings
-- ============================================
CREATE TABLE IF NOT EXISTS genre_books (
    genre_id TEXT NOT NULL,                   -- Genre identifier (fiction, science, etc.)
    book_key TEXT NOT NULL,                   -- Reference to books table
    position INTEGER DEFAULT 0,               -- Order position in the genre list
    PRIMARY KEY (genre_id, book_key),
    FOREIGN KEY (book_key) REFERENCES books(key) ON DELETE CASCADE
);

-- ============================================
-- CUSTOM_LISTS TABLE
-- User-created reading lists
-- Maximum 3 lists per user (enforced in application)
-- ============================================
CREATE TABLE IF NOT EXISTS custom_lists (
    id TEXT PRIMARY KEY NOT NULL,             -- Unique list ID
    name TEXT NOT NULL UNIQUE,                -- List name (must be unique)
    description TEXT,                         -- Optional description
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- ============================================
-- CUSTOM_LIST_BOOKS TABLE
-- Many-to-many relationship between custom lists and books
-- ============================================
CREATE TABLE IF NOT EXISTS custom_list_books (
    list_id TEXT NOT NULL,
    book_key TEXT NOT NULL,
    added_at INTEGER DEFAULT (strftime('%s', 'now')),  -- When the book was added
    PRIMARY KEY (list_id, book_key),
    FOREIGN KEY (list_id) REFERENCES custom_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (book_key) REFERENCES books(key) ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- Improve query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_year ON books(first_publish_year);
CREATE INDEX IF NOT EXISTS idx_genre_books_genre ON genre_books(genre_id);
CREATE INDEX IF NOT EXISTS idx_genre_books_position ON genre_books(position);
CREATE INDEX IF NOT EXISTS idx_custom_list_books_list ON custom_list_books(list_id);
CREATE INDEX IF NOT EXISTS idx_custom_list_books_added ON custom_list_books(added_at);
CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name);

-- ============================================
-- SAMPLE QUERIES
-- ============================================

-- Get books by genre with pagination
-- SELECT b.* FROM books b
-- JOIN genre_books gb ON b.key = gb.book_key
-- WHERE gb.genre_id = 'fiction'
-- ORDER BY gb.position
-- LIMIT 20 OFFSET 0;

-- Get books in a custom list
-- SELECT b.* FROM books b
-- JOIN custom_list_books clb ON b.key = clb.book_key
-- WHERE clb.list_id = 'list_123'
-- ORDER BY clb.added_at DESC;

-- Search books by title or author
-- SELECT DISTINCT b.* FROM books b
-- LEFT JOIN book_authors ba ON b.key = ba.book_key
-- LEFT JOIN authors a ON ba.author_id = a.id
-- WHERE LOWER(b.title) LIKE '%search_term%' 
-- OR LOWER(a.name) LIKE '%search_term%';

-- Get all custom lists with book count
-- SELECT cl.*, COUNT(clb.book_key) as book_count
-- FROM custom_lists cl
-- LEFT JOIN custom_list_books clb ON cl.id = clb.list_id
-- GROUP BY cl.id
-- ORDER BY cl.created_at DESC;
