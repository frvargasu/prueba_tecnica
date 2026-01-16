import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewWillEnter, InfiniteScrollCustomEvent, IonInput } from '@ionic/angular';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { Book, ViewState, NetworkStatus } from '../../models';
import { BookService, NetworkService, CustomListService } from '../../services';
import {
  BookCardComponent,
  LoadingStateComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  OfflineBannerComponent
} from '../../components';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
        <ion-title>Buscar libros</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <app-offline-banner 
        [isOffline]="!networkStatus.connected"
        [message]="offlineMessage"
      ></app-offline-banner>

      <!-- Search Input -->
      <div class="search-container">
        <ion-item fill="outline" class="search-item">
          <ion-icon name="search-outline" slot="start"></ion-icon>
          <ion-input
            #searchInput
            type="text"
            [(ngModel)]="searchQuery"
            (ionInput)="onSearchInput($event)"
            placeholder="Buscar por título o autor..."
            [clearInput]="true"
          ></ion-input>
        </ion-item>
        <ion-button (click)="performSearch()" [disabled]="!searchQuery || searchQuery.length < 2">
          Buscar
        </ion-button>
      </div>

      <!-- Initial State (no search) -->
      <div *ngIf="viewState === ViewState.EMPTY && !hasSearched" class="initial-state">
        <ion-icon name="search-outline"></ion-icon>
        <h3>Busca tu próximo libro</h3>
        <p>Escribe el título o nombre del autor para comenzar</p>
      </div>

      <!-- Loading State -->
      <app-loading-state 
        *ngIf="viewState === ViewState.LOADING"
        message="Buscando libros..."
      ></app-loading-state>

      <!-- Error State -->
      <app-error-state 
        *ngIf="viewState === ViewState.ERROR"
        [title]="'Error en la búsqueda'"
        [message]="errorMessage"
        [showRetry]="true"
        (retry)="performSearch()"
      ></app-error-state>

      <!-- No Results State -->
      <app-empty-state 
        *ngIf="viewState === ViewState.EMPTY && hasSearched"
        icon="search-outline"
        title="Sin resultados"
        [message]="emptyMessage"
      ></app-empty-state>

      <!-- Offline State (buscó pero sin conexión y sin cache) -->
      <app-empty-state 
        *ngIf="viewState === ViewState.OFFLINE"
        icon="cloud-offline-outline"
        title="Sin conexión"
        message="No hay resultados guardados. Conéctate a internet para buscar en línea."
        [showAction]="false"
      ></app-empty-state>

      <!-- Search Results -->
      <div *ngIf="viewState === ViewState.SUCCESS" class="results-container">
        <div class="results-info">
          <span>{{ totalItems }} resultados para "{{ lastSearchQuery }}"</span>
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
            loadingText="Cargando más resultados..."
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
    .search-container {
      display: flex;
      gap: 8px;
      padding: 16px;
      background: var(--ion-background-color);
      border-bottom: 1px solid var(--ion-color-light);
    }

    .search-item {
      flex: 1;
      --background: var(--ion-color-light);
    }

    .search-container ion-button {
      --padding-start: 16px;
      --padding-end: 16px;
    }

    .initial-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .initial-state ion-icon {
      font-size: 72px;
      color: var(--ion-color-medium);
      opacity: 0.5;
      margin-bottom: 16px;
    }

    .initial-state h3 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: var(--ion-text-color);
    }

    .initial-state p {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .results-container {
      padding: 8px;
    }

    .results-info {
      padding: 8px 16px;
      font-size: 13px;
      color: var(--ion-color-medium);
    }
  `]
})
export class SearchPage implements OnInit, OnDestroy, ViewWillEnter {
  @ViewChild('searchInput') searchInput!: IonInput;

  ViewState = ViewState;

  searchQuery = '';
  lastSearchQuery = '';
  books: Book[] = [];
  viewState: ViewState = ViewState.EMPTY;
  networkStatus: NetworkStatus = { connected: true, connectionType: 'unknown' };
  hasSearched = false;

  currentPage = 1;
  totalItems = 0;
  hasMore = true;

  errorMessage = '';
  emptyMessage = 'No se encontraron libros con ese criterio de búsqueda';
  offlineMessage = 'Sin conexión - Buscando en datos guardados';

  // Action sheet
  isActionSheetOpen = false;
  actionSheetButtons: any[] = [];
  selectedBookForList: Book | null = null;

  // Toast
  showToast = false;
  toastMessage = '';
  toastColor = 'success';

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private bookService: BookService,
    private networkService: NetworkService,
    private customListService: CustomListService
  ) { }

  ngOnInit(): void {
    // Subscribe to network status
    this.networkService.networkStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.networkStatus = status;
      });

    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      if (query.trim().length >= 2) {
        this.performSearch();
      }
    });
  }

  ionViewWillEnter(): void {
    // Focus search input when entering
    setTimeout(() => {
      this.searchInput?.setFocus();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(event: any): void {
    const query = event.detail.value || '';
    this.searchSubject.next(query);
  }

  onClearSearch(): void {
    this.searchQuery = '';
    this.books = [];
    this.hasSearched = false;
    this.viewState = ViewState.EMPTY;
  }

  async performSearch(): Promise<void> {
    const query = this.searchQuery.trim();
    
    if (query.length < 2) {
      return;
    }

    this.lastSearchQuery = query;
    this.currentPage = 1;
    this.hasSearched = true;
    this.viewState = ViewState.LOADING;

    try {
      const response = await this.bookService.searchBooks(query, this.currentPage);

      this.books = response.items;
      this.totalItems = response.totalItems;
      this.hasMore = response.hasMore;

      if (this.books.length === 0) {
        // Sin conexión Y sin resultados = estado OFFLINE
        if (!this.networkStatus.connected) {
          this.viewState = ViewState.OFFLINE;
        } else {
          this.viewState = ViewState.EMPTY;
          this.emptyMessage = 'No se encontraron libros con ese criterio de búsqueda';
        }
      } else {
        this.viewState = ViewState.SUCCESS;
      }
    } catch (error: any) {
      console.error('Search error:', error);
      this.viewState = ViewState.ERROR;
      this.errorMessage = error.message || 'Error al realizar la búsqueda';
    }
  }

  async loadMore(event: InfiniteScrollCustomEvent): Promise<void> {
    if (!this.hasMore || !this.lastSearchQuery) {
      event.target.complete();
      return;
    }

    this.currentPage++;

    try {
      const response = await this.bookService.searchBooks(this.lastSearchQuery, this.currentPage);

      this.books = [...this.books, ...response.items];
      this.hasMore = response.hasMore;
    } catch (error) {
      console.error('Error loading more results:', error);
      this.currentPage--;
    }

    event.target.complete();
  }

  onBookClick(book: Book): void {
    this.router.navigate(['/book', book.key]);
  }

  async onAddToList(book: Book): Promise<void> {
    this.selectedBookForList = book;

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
