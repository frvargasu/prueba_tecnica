import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { DatabaseService } from './services/database.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet]
})
export class AppComponent implements OnInit {
  constructor(private databaseService: DatabaseService) {}

  async ngOnInit(): Promise<void> {
    // Solo inicializar SQLite en plataformas nativas (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        await this.databaseService.initializeDatabase();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    } else {
      console.log('Running on web - SQLite disabled, using API only');
    }
  }
}
