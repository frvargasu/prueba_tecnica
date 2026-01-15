import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="loading-container">
      <ion-spinner [name]="spinnerType" [color]="color"></ion-spinner>
      <p class="loading-message" *ngIf="message">{{ message }}</p>
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      min-height: 200px;
    }

    ion-spinner {
      width: 48px;
      height: 48px;
    }

    .loading-message {
      margin-top: 16px;
      color: var(--ion-color-medium);
      font-size: 14px;
      text-align: center;
    }
  `]
})
export class LoadingStateComponent {
  @Input() message = 'Cargando...';
  @Input() spinnerType: 'bubbles' | 'circles' | 'circular' | 'crescent' | 'dots' | 'lines' | 'lines-sharp' | 'lines-sharp-small' | 'lines-small' = 'crescent';
  @Input() color = 'primary';
}
