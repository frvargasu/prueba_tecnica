import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule, ViewWillEnter, AlertController } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { CustomList, ViewState, LIST_CONSTANTS } from '../../models';
import { CustomListService } from '../../services';
import {
  LoadingStateComponent,
  EmptyStateComponent,
  ErrorStateComponent
} from '../../components';

@Component({
  selector: 'app-lists',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Mis listas</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="createNewList()" [disabled]="!canCreateMore">
            <ion-icon slot="icon-only" name="add-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Info Banner -->
      <div class="info-banner" *ngIf="lists.length > 0">
        <ion-icon name="information-circle-outline"></ion-icon>
        <span>{{ lists.length }} de {{ maxLists }} listas creadas</span>
      </div>

      <!-- Loading State -->
      <app-loading-state 
        *ngIf="viewState === ViewState.LOADING"
        message="Cargando listas..."
      ></app-loading-state>

      <!-- Error State -->
      <app-error-state 
        *ngIf="viewState === ViewState.ERROR"
        [title]="'Error al cargar'"
        [message]="'No se pudieron cargar tus listas'"
        [showRetry]="true"
        (retry)="loadLists()"
      ></app-error-state>

      <!-- Empty State -->
      <app-empty-state 
        *ngIf="viewState === ViewState.EMPTY"
        icon="bookmark-outline"
        title="Sin listas"
        message="Crea tu primera lista para organizar tus libros favoritos"
        [showAction]="true"
        actionText="Crear lista"
        (actionClick)="createNewList()"
      ></app-empty-state>

      <!-- Lists -->
      <ion-list *ngIf="viewState === ViewState.SUCCESS" class="lists-container">
        <ion-item-sliding *ngFor="let list of lists">
          <ion-item (click)="openList(list)" detail>
            <ion-icon name="bookmark" slot="start" color="primary"></ion-icon>
            <ion-label>
              <h2>{{ list.name }}</h2>
              <p *ngIf="list.description">{{ list.description }}</p>
              <p class="book-count">
                <ion-icon name="book-outline"></ion-icon>
                {{ list.bookCount }} {{ list.bookCount === 1 ? 'libro' : 'libros' }}
              </p>
            </ion-label>
            <ion-note slot="end">
              {{ formatDate(list.updatedAt) }}
            </ion-note>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option color="primary" (click)="editList(list)">
              <ion-icon slot="icon-only" name="create-outline"></ion-icon>
            </ion-item-option>
            <ion-item-option color="danger" (click)="confirmDelete(list)">
              <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <!-- Floating Action Button -->
      <ion-fab *ngIf="viewState === ViewState.SUCCESS && canCreateMore" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button (click)="createNewList()">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
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
    .info-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--ion-color-primary-tint);
      color: var(--ion-color-primary-shade);
      font-size: 13px;
    }

    .lists-container {
      padding-bottom: 80px;
    }

    ion-item h2 {
      font-weight: 600;
    }

    ion-item p {
      font-size: 13px;
    }

    .book-count {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--ion-color-medium);
      margin-top: 4px;
    }

    .book-count ion-icon {
      font-size: 14px;
    }

    ion-note {
      font-size: 12px;
    }
  `]
})
export class ListsPage implements OnInit, OnDestroy, ViewWillEnter {
  ViewState = ViewState;

  lists: CustomList[] = [];
  viewState: ViewState = ViewState.LOADING;
  canCreateMore = true;
  maxLists = LIST_CONSTANTS.MAX_LISTS;

  // Toast
  showToast = false;
  toastMessage = '';
  toastColor = 'success';

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private customListService: CustomListService,
    private alertController: AlertController
  ) { }

  ngOnInit(): void { }

  ionViewWillEnter(): void {
    this.loadLists();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadLists(): Promise<void> {
    this.viewState = ViewState.LOADING;

    try {
      this.lists = await this.customListService.getLists();
      this.canCreateMore = await this.customListService.canCreateMoreLists();

      if (this.lists.length === 0) {
        this.viewState = ViewState.EMPTY;
      } else {
        this.viewState = ViewState.SUCCESS;
      }
    } catch (error) {
      console.error('Error loading lists:', error);
      this.viewState = ViewState.ERROR;
    }
  }

  createNewList(): void {
    if (!this.canCreateMore) {
      this.showToastMessage(`No puedes crear más de ${this.maxLists} listas`, 'warning');
      return;
    }
    this.router.navigate(['/lists/new']);
  }

  openList(list: CustomList): void {
    this.router.navigate(['/lists', list.id]);
  }

  editList(list: CustomList): void {
    this.router.navigate(['/lists', list.id, 'edit']);
  }

  async confirmDelete(list: CustomList): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar lista',
      message: `¿Estás seguro de eliminar "${list.name}"? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.deleteList(list)
        }
      ]
    });

    await alert.present();
  }

  private async deleteList(list: CustomList): Promise<void> {
    const result = await this.customListService.deleteList(list.id);

    if (result.success) {
      this.showToastMessage('Lista eliminada', 'success');
      this.loadLists();
    } else {
      this.showToastMessage(result.error || 'Error al eliminar la lista', 'danger');
    }
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    
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
