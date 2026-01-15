import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="error-container">
      <ion-icon [name]="icon" color="danger"></ion-icon>
      <h3 class="error-title">{{ title }}</h3>
      <p class="error-message">{{ message }}</p>
      <ion-button 
        *ngIf="showRetry" 
        fill="outline" 
        color="primary"
        (click)="onRetry()"
        class="retry-button"
      >
        <ion-icon name="refresh-outline" slot="start"></ion-icon>
        {{ retryText }}
      </ion-button>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      min-height: 250px;
      text-align: center;
    }

    ion-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .error-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: var(--ion-text-color);
    }

    .error-message {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0 0 20px 0;
      max-width: 300px;
      line-height: 1.5;
    }

    .retry-button {
      margin-top: 8px;
    }
  `]
})
export class ErrorStateComponent {
  @Input() icon = 'alert-circle-outline';
  @Input() title = 'Error';
  @Input() message = 'Ha ocurrido un error. Por favor, intenta de nuevo.';
  @Input() showRetry = true;
  @Input() retryText = 'Reintentar';

  @Output() retry = new EventEmitter<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
