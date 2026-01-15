import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="offline-banner" *ngIf="isOffline">
      <ion-icon name="cloud-offline-outline"></ion-icon>
      <span>{{ message }}</span>
    </div>
  `,
  styles: [`
    .offline-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--ion-color-warning);
      color: var(--ion-color-warning-contrast);
      font-size: 13px;
      font-weight: 500;
    }

    ion-icon {
      font-size: 18px;
    }
  `]
})
export class OfflineBannerComponent {
  @Input() isOffline = false;
  @Input() message = 'Sin conexión - Mostrando datos guardados';
}
