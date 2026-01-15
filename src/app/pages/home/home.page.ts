import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { Genre, GENRES, NetworkStatus } from '../../models';
import { NetworkService, DatabaseService } from '../../services';
import { OfflineBannerComponent } from '../../components';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonicModule, OfflineBannerComponent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Open Library</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="goToSearch()">
            <ion-icon slot="icon-only" name="search-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="goToLists()">
            <ion-icon slot="icon-only" name="list-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <app-offline-banner [isOffline]="!networkStatus.connected"></app-offline-banner>

      <div class="home-container">
        <!-- Welcome Section -->
        <div class="welcome-section">
          <h1>Explora tu próxima lectura</h1>
          <p>Descubre libros de diferentes géneros y crea tus propias listas de lectura</p>
        </div>

        <!-- Genres Grid -->
        <div class="section-header">
          <h2>Géneros</h2>
          <p>Selecciona un género para explorar</p>
        </div>

        <div class="genres-grid">
          <ion-card 
            *ngFor="let genre of genres" 
            (click)="selectGenre(genre)"
            class="genre-card"
            [style.--genre-color]="getGenreColor(genre.id)"
          >
            <div class="genre-icon">
              <ion-icon [name]="genre.icon"></ion-icon>
            </div>
            <ion-card-header>
              <ion-card-title>{{ genre.name }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>{{ genre.description }}</p>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <ion-button expand="block" fill="outline" (click)="goToSearch()">
            <ion-icon name="search-outline" slot="start"></ion-icon>
            Buscar libros
          </ion-button>
          <ion-button expand="block" fill="outline" (click)="goToLists()">
            <ion-icon name="bookmark-outline" slot="start"></ion-icon>
            Mis listas
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .home-container {
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
    }

    .welcome-section {
      text-align: center;
      padding: 24px 16px;
      margin-bottom: 16px;
    }

    .welcome-section h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: var(--ion-color-primary);
    }

    .welcome-section p {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .section-header {
      margin-bottom: 16px;
    }

    .section-header h2 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .section-header p {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .genres-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    @media (min-width: 600px) {
      .genres-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .genre-card {
      margin: 0;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      text-align: center;
    }

    .genre-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    .genre-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      margin: 16px auto 0;
      border-radius: 50%;
      background: var(--genre-color, var(--ion-color-primary-tint));
    }

    .genre-icon ion-icon {
      font-size: 28px;
      color: white;
    }

    .genre-card ion-card-header {
      padding: 12px 12px 4px;
    }

    .genre-card ion-card-title {
      font-size: 16px;
      font-weight: 600;
    }

    .genre-card ion-card-content {
      padding: 0 12px 16px;
    }

    .genre-card ion-card-content p {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 0;
      line-height: 1.4;
    }

    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 0;
    }

    @media (min-width: 500px) {
      .quick-actions {
        flex-direction: row;
      }

      .quick-actions ion-button {
        flex: 1;
      }
    }
  `]
})
export class HomePage implements OnInit, ViewWillEnter {
  genres: Genre[] = GENRES;
  networkStatus: NetworkStatus = { connected: true, connectionType: 'unknown' };

  private genreColors: Record<string, string> = {
    'fiction': '#6366f1',
    'science': '#10b981',
    'history': '#f59e0b',
    'fantasy': '#8b5cf6'
  };

  constructor(
    private router: Router,
    private networkService: NetworkService,
    private databaseService: DatabaseService
  ) { }

  async ngOnInit(): Promise<void> {
    // Initialize database
    await this.databaseService.initializeDatabase();

    // Subscribe to network changes
    this.networkService.networkStatus$.subscribe(status => {
      this.networkStatus = status;
    });
  }

  ionViewWillEnter(): void {
    // Refresh network status when entering view
    this.networkService.isOnline().then(online => {
      this.networkStatus.connected = online;
    });
  }

  selectGenre(genre: Genre): void {
    this.router.navigate(['/genre', genre.id]);
  }

  goToSearch(): void {
    this.router.navigate(['/search']);
  }

  goToLists(): void {
    this.router.navigate(['/lists']);
  }

  getGenreColor(genreId: string): string {
    return this.genreColors[genreId] || 'var(--ion-color-primary)';
  }
}
