import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Book } from '../../models';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-card (click)="onCardClick()" class="book-card" [class.compact]="compact">
      <div class="card-content">
        <!-- Book Cover -->
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

        <!-- Book Info -->
        <div class="book-info">
          <h3 class="book-title">{{ book.title }}</h3>
          
          <p class="book-authors" *ngIf="book.authors?.length">
            <ion-icon name="person-outline"></ion-icon>
            {{ getAuthorsText() }}
          </p>
          
          <p class="book-year" *ngIf="book.firstPublishYear">
            <ion-icon name="calendar-outline"></ion-icon>
            {{ book.firstPublishYear }}
          </p>

          <!-- Actions -->
          <div class="card-actions" *ngIf="showActions">
            <ion-button 
              fill="clear" 
              size="small" 
              (click)="onAddToList($event)"
              title="Agregar a lista"
            >
              <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
            </ion-button>
          </div>
        </div>
      </div>
    </ion-card>
  `,
  styles: [`
    .book-card {
      margin: 8px;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .book-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .card-content {
      display: flex;
      padding: 12px;
      gap: 12px;
    }

    .cover-container {
      flex-shrink: 0;
      width: 80px;
      height: 120px;
      border-radius: 4px;
      overflow: hidden;
      background: var(--ion-color-light);
    }

    .book-card.compact .cover-container {
      width: 60px;
      height: 90px;
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
      font-size: 32px;
    }

    .book-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .book-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 8px 0;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      color: var(--ion-text-color);
    }

    .book-card.compact .book-title {
      font-size: 14px;
      -webkit-line-clamp: 2;
    }

    .book-authors, .book-year {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin: 0 0 4px 0;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .book-authors {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .book-authors ion-icon, .book-year ion-icon {
      font-size: 14px;
      flex-shrink: 0;
    }

    .card-actions {
      margin-top: auto;
      display: flex;
      justify-content: flex-end;
    }

    .card-actions ion-button {
      --padding-start: 4px;
      --padding-end: 4px;
    }
  `]
})
export class BookCardComponent {
  @Input() book!: Book;
  @Input() compact = false;
  @Input() showActions = true;

  @Output() cardClick = new EventEmitter<Book>();
  @Output() addToList = new EventEmitter<Book>();

  getAuthorsText(): string {
    if (!this.book.authors || this.book.authors.length === 0) {
      return 'Autor desconocido';
    }
    
    if (this.book.authors.length <= 2) {
      return this.book.authors.map(a => a.name).join(', ');
    }
    
    return `${this.book.authors[0].name} y otros`;
  }

  onCardClick(): void {
    this.cardClick.emit(this.book);
  }

  onAddToList(event: Event): void {
    event.stopPropagation();
    this.addToList.emit(this.book);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    // Show no-cover placeholder
    const container = img.parentElement;
    if (container) {
      container.innerHTML = '<div class="no-cover"><ion-icon name="book-outline"></ion-icon></div>';
    }
  }
}
