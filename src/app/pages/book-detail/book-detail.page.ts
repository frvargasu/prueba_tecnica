import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { Book, ViewState, NetworkStatus, CustomList } from '../../models';
import { BookService, NetworkService, CustomListService } from '../../services';
import {
  LoadingStateComponent,
  ErrorStateComponent,
  OfflineBannerComponent
} from '../../components';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    LoadingStateComponent,
    ErrorStateComponent,
    OfflineBannerComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Detalle del libro</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openAddToListSheet()">
            <ion-icon slot="icon-only" name="bookmark-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <app-offline-banner [isOffline]="!networkStatus.connected"></app-offline-banner>

      <!-- Loading State -->
      <app-loading-state 
        *ngIf="viewState === ViewState.LOADING"
        message="Cargando detalles..."
      ></app-loading-state>

      <!-- Error State -->
      <app-error-state 
        *ngIf="viewState === ViewState.ERROR"
        [title]="'Error al cargar'"
        [message]="errorMessage"
        [showRetry]="true"
        (retry)="loadBookDetails()"
      ></app-error-state>

      <!-- Book Details -->
      <div *ngIf="viewState === ViewState.SUCCESS && book" class="book-detail">
        <!-- Cover Image -->
        <div class="cover-section">
          <div class="cover-container">
            <img 
              *ngIf="book.coverUrl" 
              [src]="book.coverUrl" 
              [alt]="book.title"
              class="book-cover"
              (error)="onImageError($event)"
            />
            <div *ngIf="!book.coverUrl" class="no-cover">
              <ion-icon name="book-outline"></ion-icon>
            </div>
          </div>
        </div>

        <!-- Book Info -->
        <div class="info-section">
          <h1 class="book-title">{{ book.title }}</h1>

          <!-- Authors -->
          <div class="info-row" *ngIf="book.authors?.length">
            <ion-icon name="person-outline"></ion-icon>
            <span class="info-label">Autor(es):</span>
            <span class="info-value">{{ getAuthorsText() }}</span>
          </div>

          <!-- Year -->
          <div class="info-row" *ngIf="book.firstPublishYear">
            <ion-icon name="calendar-outline"></ion-icon>
            <span class="info-label">Año de publicación:</span>
            <span class="info-value">{{ book.firstPublishYear }}</span>
          </div>

          <!-- ISBN -->
          <div class="info-row" *ngIf="book.isbn?.length">
            <ion-icon name="barcode-outline"></ion-icon>
            <span class="info-label">ISBN:</span>
            <span class="info-value">{{ book.isbn![0] }}</span>
          </div>

          <!-- Subjects/Categories -->
          <div class="subjects-section" *ngIf="book.subjects?.length">
            <h3>Categorías</h3>
            <div class="subjects-chips">
              <ion-chip *ngFor="let subject of getDisplaySubjects()" color="primary" outline>
                {{ subject }}
              </ion-chip>
              <ion-chip *ngIf="book.subjects!.length > 5" color="medium" outline>
                +{{ book.subjects!.length - 5 }} más
              </ion-chip>
            </div>
          </div>

          <!-- Description -->
          <div class="description-section" *ngIf="book.description">
            <h3>Descripción</h3>
            <p class="description-text" [class.expanded]="descriptionExpanded">
              {{ book.description }}
            </p>
            <ion-button 
              *ngIf="book.description.length > 300"
              fill="clear" 
              size="small"
              (click)="toggleDescription()"
            >
              {{ descriptionExpanded ? 'Ver menos' : 'Ver más' }}
            </ion-button>
          </div>

          <!-- In Lists -->
          <div class="lists-section" *ngIf="containingLists.length > 0">
            <h3>En tus listas</h3>
            <ion-chip 
              *ngFor="let list of containingLists" 
              color="success"
              (click)="goToList(list.id)"
            >
              <ion-icon name="bookmark"></ion-icon>
              {{ list.name }}
            </ion-chip>
          </div>

          <!-- Actions -->
          <div class="actions-section">
            <ion-button expand="block" (click)="openAddToListSheet()">
              <ion-icon name="add-outline" slot="start"></ion-icon>
              Agregar a lista
            </ion-button>
          </div>
        </div>
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
    .book-detail {
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
    }

    .cover-section {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
    }

    .cover-container {
      width: 180px;
      height: 270px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }

    .book-cover {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .no-cover {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ion-color-light);
      color: var(--ion-color-medium);
    }

    .no-cover ion-icon {
      font-size: 64px;
    }

    .info-section {
      padding: 0 8px;
    }

    .book-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 16px 0;
      text-align: center;
      color: var(--ion-text-color);
    }

    .info-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--ion-color-light);
    }

    .info-row ion-icon {
      font-size: 20px;
      color: var(--ion-color-primary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .info-label {
      font-weight: 500;
      color: var(--ion-color-medium);
      flex-shrink: 0;
    }

    .info-value {
      color: var(--ion-text-color);
    }

    .subjects-section, .description-section, .lists-section {
      margin-top: 24px;
    }

    .subjects-section h3, .description-section h3, .lists-section h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: var(--ion-text-color);
    }

    .subjects-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .subjects-chips ion-chip {
      font-size: 12px;
    }

    .description-text {
      font-size: 14px;
      line-height: 1.6;
      color: var(--ion-text-color);
      margin: 0;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 6;
      -webkit-box-orient: vertical;
    }

    .description-text.expanded {
      -webkit-line-clamp: unset;
    }

    .lists-section ion-chip {
      cursor: pointer;
    }

    .actions-section {
      margin-top: 32px;
      padding-bottom: 32px;
    }
  `]
})
export class BookDetailPage implements OnInit, OnDestroy, ViewWillEnter {
  ViewState = ViewState;

  book: Book | null = null;
  viewState: ViewState = ViewState.LOADING;
  networkStatus: NetworkStatus = { connected: true, connectionType: 'unknown' };
  errorMessage = 'Error al cargar los detalles del libro';
  descriptionExpanded = false;
  containingLists: CustomList[] = [];

  // Action sheet
  isActionSheetOpen = false;
  actionSheetButtons: any[] = [];

  // Toast
  showToast = false;
  toastMessage = '';
  toastColor = 'success';

  private bookKey: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
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
  }

  ionViewWillEnter(): void {
    const key = this.route.snapshot.paramMap.get('key');
    if (key) {
      this.bookKey = key;
      this.loadBookDetails();
      this.loadContainingLists();
    } else {
      this.router.navigate(['/home']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadBookDetails(): Promise<void> {
    this.viewState = ViewState.LOADING;

    try {
      this.book = await this.bookService.getBookDetails(this.bookKey);

      if (this.book) {
        this.viewState = ViewState.SUCCESS;
      } else {
        this.viewState = ViewState.ERROR;
        this.errorMessage = 'No se encontró el libro';
      }
    } catch (error: any) {
      console.error('Error loading book details:', error);
      this.viewState = ViewState.ERROR;
      this.errorMessage = error.message || 'Error al cargar los detalles';
    }
  }

  async loadContainingLists(): Promise<void> {
    try {
      this.containingLists = await this.customListService.getListsContainingBook(this.bookKey);
    } catch (error) {
      console.error('Error loading containing lists:', error);
    }
  }

  getAuthorsText(): string {
    if (!this.book?.authors || this.book.authors.length === 0) {
      return 'Autor desconocido';
    }
    return this.book.authors.map(a => a.name).join(', ');
  }

  getDisplaySubjects(): string[] {
    if (!this.book?.subjects) return [];
    return this.book.subjects.slice(0, 5);
  }

  toggleDescription(): void {
    this.descriptionExpanded = !this.descriptionExpanded;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  goToList(listId: string): void {
    this.router.navigate(['/lists', listId]);
  }

  async openAddToListSheet(): Promise<void> {
    if (!this.book) return;

    const lists = await this.customListService.getLists();
    const canCreate = await this.customListService.canCreateMoreLists();

    const buttons: any[] = [];

    // Add existing lists
    for (const list of lists) {
      const isInList = await this.customListService.isBookInList(list.id, this.book.key);
      buttons.push({
        text: list.name + (isInList ? ' ✓' : ''),
        icon: isInList ? 'bookmark' : 'bookmark-outline',
        cssClass: isInList ? 'action-sheet-selected' : '',
        handler: () => {
          if (!isInList) {
            this.addBookToList(list.id);
          } else {
            this.showToastMessage('El libro ya está en esta lista', 'warning');
          }
        }
      });
    }

    // Add create option if allowed
    if (canCreate) {
      buttons.push({
        text: 'Crear nueva lista',
        icon: 'add-outline',
        handler: () => {
          this.router.navigate(['/lists/new'], {
            queryParams: { bookKey: this.book?.key }
          });
        }
      });
    }

    buttons.push({
      text: 'Cancelar',
      role: 'cancel',
      icon: 'close-outline'
    });

    this.actionSheetButtons = buttons;
    this.isActionSheetOpen = true;
  }

  private async addBookToList(listId: string): Promise<void> {
    if (!this.book) return;

    const result = await this.customListService.addBookToList(listId, this.book);

    if (result.success) {
      this.showToastMessage('Libro agregado a la lista', 'success');
      this.loadContainingLists();
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
