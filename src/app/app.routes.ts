import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage)
  },
  {
    path: 'genre/:id',
    loadComponent: () => import('./pages/genre-books/genre-books.page').then(m => m.GenreBooksPage)
  },
  {
    path: 'book/:key',
    loadComponent: () => import('./pages/book-detail/book-detail.page').then(m => m.BookDetailPage)
  },
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search.page').then(m => m.SearchPage)
  },
  {
    path: 'lists',
    loadComponent: () => import('./pages/lists/lists.page').then(m => m.ListsPage)
  },
  {
    path: 'lists/new',
    loadComponent: () => import('./pages/list-form/list-form.page').then(m => m.ListFormPage)
  },
  {
    path: 'lists/:id',
    loadComponent: () => import('./pages/list-detail/list-detail.page').then(m => m.ListDetailPage)
  },
  {
    path: 'lists/:id/edit',
    loadComponent: () => import('./pages/list-form/list-form.page').then(m => m.ListFormPage)
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
