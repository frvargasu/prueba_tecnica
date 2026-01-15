/**
 * Genre/Subject category for books
 */
export interface Genre {
  id: string;
  name: string;
  icon: string;
  description: string;
  subject: string; // Open Library subject query parameter
}

/**
 * Static genres used in the app
 */
export const GENRES: Genre[] = [
  {
    id: 'fiction',
    name: 'Ficción',
    icon: 'book-outline',
    description: 'Novelas y relatos de ficción',
    subject: 'fiction'
  },
  {
    id: 'science',
    name: 'Ciencia',
    icon: 'flask-outline',
    description: 'Libros de divulgación científica',
    subject: 'science'
  },
  {
    id: 'history',
    name: 'Historia',
    icon: 'time-outline',
    description: 'Historia y eventos históricos',
    subject: 'history'
  },
  {
    id: 'fantasy',
    name: 'Fantasía',
    icon: 'sparkles-outline',
    description: 'Mundos mágicos y aventuras épicas',
    subject: 'fantasy'
  }
];
