import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="empty-container">
      <ion-icon [name]="icon" [color]="iconColor"></ion-icon>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-message" *ngIf="message">{{ message }}</p>
      <ion-button 
        *ngIf="showAction && actionText" 
        [fill]="actionFill" 
        (click)="onAction()"
        class="action-button"
      >
        {{ actionText }}
      </ion-button>
    </div>
  `,
  styles: [`
    .empty-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      min-height: 250px;
      text-align: center;
    }

    ion-icon {
      font-size: 72px;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: var(--ion-text-color);
    }

    .empty-message {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0 0 20px 0;
      max-width: 280px;
      line-height: 1.5;
    }

    .action-button {
      margin-top: 8px;
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon = 'folder-open-outline';
  @Input() iconColor = 'medium';
  @Input() title = 'Sin resultados';
  @Input() message = '';
  @Input() showAction = false;
  @Input() actionText = '';
  @Input() actionFill: 'clear' | 'outline' | 'solid' = 'outline';

  @Output() actionClick = new EventEmitter<void>();

  onAction(): void {
    this.actionClick.emit();
  }
}
