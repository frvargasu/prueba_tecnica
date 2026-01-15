import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule, ViewWillEnter, AlertController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { Book, CustomList, ViewState } from '../../models';
import { CustomListService } from '../../services';
import {
  BookCardComponent,
  LoadingStateComponent,
  EmptyStateComponent,
  ErrorStateComponent
} from '../../components';

@Component({
  selector: 'app-list-detail',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    BookCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/lists"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ list?.name || 'Lista' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="editList()">
            <ion-icon slot="icon-only" name="create-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="confirmDelete()">
            <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Loading State -->
      <app-loading-state 
        *ngIf="viewState === ViewState.LOADING"
        message="Cargando lista..."
      ></app-loading-state>

      <!-- Error State -->
      <app-error-state 
        *ngIf="viewState === ViewState.ERROR"
        [title]="'Error al cargar'"
        [message]="'No se pudo cargar la lista'"
        [showRetry]="true"
        (retry)="loadListDetails()"
      ></app-error-state>

      <!-- List Details -->
      <div *ngIf="viewState === ViewState.SUCCESS || viewState === ViewState.EMPTY" class="list-container">
        <!-- List Info -->
        <div class="list-header" *ngIf="list">
          <h1>{{ list.name }}</h1>
          <p *ngIf="list.description" class="description">{{ list.description }}</p>
          <p class="meta">
            <ion-icon name="book-outline"></ion-icon>
            {{ books.length }} {{ books.length === 1 ? 'libro' : 'libros' }}
            <span class="separator">•</span>
            Actualizada {{ formatDate(list.updatedAt) }}
          </p>
        </div>

        <!-- Empty State -->
        <app-empty-state 
          *ngIf="viewState === ViewState.EMPTY"
          icon="book-outline"
          title="Lista vacía"
          message="Agrega libros a esta lista desde la búsqueda o desde los listados por género"
          [showAction]="true"
          actionText="Buscar libros"
          (actionClick)="goToSearch()"
        ></app-empty-state>

        <!-- Books List -->
        <div *ngIf="viewState === ViewState.SUCCESS" class="books-list">
          <ion-item-sliding *ngFor="let book of books">
            <app-book-card
              [book]="book"
              [showActions]="false"
              (cardClick)="onBookClick($event)"
            ></app-book-card>

            <ion-item-options side="end">
              <ion-item-option color="danger" (click)="confirmRemoveBook(book)">
                <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </div>
      </div>
    </ion-content>

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
    .list-container {
      padding: 16px;
    }

    .list-header {
      text-align: center;
      padding: 16px 0 24px;
      border-bottom: 1px solid var(--ion-color-light);
      margin-bottom: 16px;
    }

    .list-header h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    .list-header .description {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0 0 12px 0;
    }

    .list-header .meta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .list-header .meta ion-icon {
      font-size: 16px;
    }

    .separator {
      margin: 0 4px;
    }

    .books-list {
      margin: 0 -8px;
    }

    ion-item-sliding {
      margin-bottom: 4px;
    }
  `]
})
export class ListDetailPage implements OnInit, OnDestroy, ViewWillEnter {
  ViewState = ViewState;

  list: CustomList | null = null;
  books: Book[] = [];
  viewState: ViewState = ViewState.LOADING;

  // Toast
  showToast = false;
  toastMessage = '';
  toastColor = 'success';

  private listId: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customListService: CustomListService,
    private alertController: AlertController
  ) { }

  ngOnInit(): void { }

  ionViewWillEnter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.listId = id;
      this.loadListDetails();
    } else {
      this.router.navigate(['/lists']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadListDetails(): Promise<void> {
    this.viewState = ViewState.LOADING;

    try {
      this.list = await this.customListService.getList(this.listId);

      if (!this.list) {
        this.viewState = ViewState.ERROR;
        return;
      }

      this.books = await this.customListService.getBooksInList(this.listId);

      if (this.books.length === 0) {
        this.viewState = ViewState.EMPTY;
      } else {
        this.viewState = ViewState.SUCCESS;
      }
    } catch (error) {
      console.error('Error loading list details:', error);
      this.viewState = ViewState.ERROR;
    }
  }

  editList(): void {
    this.router.navigate(['/lists', this.listId, 'edit']);
  }

  async confirmDelete(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar lista',
      message: `¿Estás seguro de eliminar "${this.list?.name}"? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.deleteList()
        }
      ]
    });

    await alert.present();
  }

  private async deleteList(): Promise<void> {
    const result = await this.customListService.deleteList(this.listId);

    if (result.success) {
      this.showToastMessage('Lista eliminada', 'success');
      this.router.navigate(['/lists']);
    } else {
      this.showToastMessage(result.error || 'Error al eliminar la lista', 'danger');
    }
  }

  async confirmRemoveBook(book: Book): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar libro',
      message: `¿Quieres eliminar "${book.title}" de esta lista?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.removeBook(book)
        }
      ]
    });

    await alert.present();
  }

  private async removeBook(book: Book): Promise<void> {
    const result = await this.customListService.removeBookFromList(this.listId, book.key);

    if (result.success) {
      this.showToastMessage('Libro eliminado de la lista', 'success');
      this.loadListDetails();
    } else {
      this.showToastMessage(result.error || 'Error al eliminar el libro', 'danger');
    }
  }

  onBookClick(book: Book): void {
    this.router.navigate(['/book', book.key]);
  }

  goToSearch(): void {
    this.router.navigate(['/search']);
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'hoy';
    if (days === 1) return 'ayer';
    if (days < 7) return `hace ${days} días`;
    
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  }

  private showToastMessage(message: string, color: string): void {
    this.toastMessage = message;
    this.toastColor = color;
    this.showToast = true;
  }
}
