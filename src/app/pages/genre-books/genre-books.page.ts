import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule, ViewWillEnter, InfiniteScrollCustomEvent } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { Book, Genre, GENRES, ViewState, NetworkStatus } from '../../models';
import { BookService, NetworkService, CustomListService } from '../../services';
import {
  BookCardComponent,
  LoadingStateComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  OfflineBannerComponent
} from '../../components';

@Component({
  selector: 'app-genre-books',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    BookCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    OfflineBannerComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ genre?.name || 'Libros' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <app-offline-banner 
        [isOffline]="!networkStatus.connected"
        [message]="offlineMessage"
      ></app-offline-banner>

      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Loading State -->
      <app-loading-state 
        *ngIf="viewState === ViewState.LOADING"
        message="Cargando libros..."
      ></app-loading-state>

      <!-- Error State -->
      <app-error-state 
        *ngIf="viewState === ViewState.ERROR"
        [title]="'Error al cargar'"
        [message]="errorMessage"
        [showRetry]="true"
        (retry)="loadBooks()"
      ></app-error-state>

      <!-- Empty State -->
      <app-empty-state 
        *ngIf="viewState === ViewState.EMPTY"
        icon="book-outline"
        title="Sin libros"
        [message]="emptyMessage"
        [showAction]="!networkStatus.connected"
        actionText="Reintentar"
        (actionClick)="loadBooks()"
      ></app-empty-state>

      <!-- Books List -->
      <div *ngIf="viewState === ViewState.SUCCESS" class="books-container">
        <div class="results-info" *ngIf="totalItems > 0">
          <span>{{ totalItems }} libros encontrados</span>
        </div>

        <app-book-card
          *ngFor="let book of books"
          [book]="book"
          [showActions]="true"
          (cardClick)="onBookClick($event)"
          (addToList)="onAddToList($event)"
        ></app-book-card>

        <ion-infinite-scroll 
          (ionInfinite)="loadMore($event)"
          [disabled]="!hasMore"
        >
          <ion-infinite-scroll-content
            loadingSpinner="crescent"
            loadingText="Cargando más libros..."
          ></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </div>
    </ion-content>

    <!-- Add to List Action Sheet -->
    <ion-action-sheet
      [isOpen]="isActionSheetOpen"
      [header]="'Agregar a lista'"
      [buttons]="actionSheetButtons"
      (didDismiss)="isActionSheetOpen = false"
    ></ion-action-sheet>

    <!-- Toast -->
    <ion-toast
      [isOpen]="showToast"
      [message]="toastMessage"
      [duration]="2000"
      [color]="toastColor"
      (didDismiss)="showToast = false"
    ></ion-toast>
  `,
  styles: [`
    .books-container {
      padding: 8px;
    }

    .results-info {
      padding: 8px 16px;
      font-size: 13px;
      color: var(--ion-color-medium);
    }
  `]
})
export class GenreBooksPage implements OnInit, OnDestroy, ViewWillEnter {
  ViewState = ViewState;

  genre: Genre | undefined;
  books: Book[] = [];
  viewState: ViewState = ViewState.LOADING;
  networkStatus: NetworkStatus = { connected: true, connectionType: 'unknown' };

  currentPage = 1;
  totalItems = 0;
  hasMore = true;

  errorMessage = '';
  emptyMessage = 'No hay libros disponibles para este género';
  offlineMessage = 'Sin conexión - Mostrando datos guardados';

  // Action sheet for adding to list
  isActionSheetOpen = false;
  actionSheetButtons: any[] = [];
  selectedBookForList: Book | null = null;

  // Toast
  showToast = false;
  toastMessage = '';
  toastColor = 'success';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookService: BookService,
    private networkService: NetworkService,
    private customListService: CustomListService
  ) { }

  ngOnInit(): void {
    // Get genre from route
    const genreId = this.route.snapshot.paramMap.get('id');
    this.genre = GENRES.find(g => g.id === genreId);

    if (!this.genre) {
      this.router.navigate(['/home']);
      return;
    }

    // Subscribe to network status
    this.networkService.networkStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        const wasOffline = !this.networkStatus.connected;
        this.networkStatus = status;

        // Refresh if we just came back online and have no data
        if (wasOffline && status.connected && this.books.length === 0) {
          this.loadBooks();
        }
      });
  }

  ionViewWillEnter(): void {
    if (this.books.length === 0) {
      this.loadBooks();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadBooks(refresh = false): Promise<void> {
    if (!this.genre) return;

    if (refresh) {
      this.currentPage = 1;
      this.books = [];
    }

    this.viewState = ViewState.LOADING;

    try {
      const response = await this.bookService.getBooksByGenre(this.genre.id, this.currentPage);

      this.books = response.items;
      this.totalItems = response.totalItems;
      this.hasMore = response.hasMore;

      if (this.books.length === 0) {
        this.viewState = ViewState.EMPTY;
        if (!this.networkStatus.connected) {
          this.emptyMessage = 'No hay libros guardados para modo offline. Conéctate a internet para cargar libros.';
        }
      } else {
        this.viewState = ViewState.SUCCESS;
      }
    } catch (error: any) {
      console.error('Error loading books:', error);
      this.viewState = ViewState.ERROR;
      this.errorMessage = error.message || 'Error al cargar los libros';
    }
  }

  async loadMore(event: InfiniteScrollCustomEvent): Promise<void> {
    if (!this.genre || !this.hasMore) {
      event.target.complete();
      return;
    }

    this.currentPage++;

    try {
      const response = await this.bookService.getBooksByGenre(this.genre.id, this.currentPage);

      this.books = [...this.books, ...response.items];
      this.hasMore = response.hasMore;
    } catch (error) {
      console.error('Error loading more books:', error);
      this.currentPage--;
    }

    event.target.complete();
  }

  async onRefresh(event: any): Promise<void> {
    await this.loadBooks(true);
    event.target.complete();
  }

  onBookClick(book: Book): void {
    this.router.navigate(['/book', book.key]);
  }

  async onAddToList(book: Book): Promise<void> {
    this.selectedBookForList = book;

    // Get available lists
    const lists = await this.customListService.getLists();

    if (lists.length === 0) {
      this.actionSheetButtons = [
        {
          text: 'Crear nueva lista',
          icon: 'add-outline',
          handler: () => {
            this.router.navigate(['/lists/new'], {
              queryParams: { bookKey: book.key }
            });
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: 'close-outline'
        }
      ];
    } else {
      this.actionSheetButtons = [
        ...lists.map(list => ({
          text: list.name,
          icon: 'bookmark-outline',
          handler: () => this.addBookToList(list.id, book)
        })),
        {
          text: 'Crear nueva lista',
          icon: 'add-outline',
          handler: () => {
            this.router.navigate(['/lists/new'], {
              queryParams: { bookKey: book.key }
            });
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: 'close-outline'
        }
      ];
    }

    this.isActionSheetOpen = true;
  }

  private async addBookToList(listId: string, book: Book): Promise<void> {
    const result = await this.customListService.addBookToList(listId, book);

    if (result.success) {
      this.showToastMessage('Libro agregado a la lista', 'success');
    } else {
      this.showToastMessage(result.error || 'Error al agregar el libro', 'danger');
    }
  }

  private showToastMessage(message: string, color: string): void {
    this.toastMessage = message;
    this.toastColor = color;
    this.showToast = true;
  }
}
