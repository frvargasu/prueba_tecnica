import { Injectable, NgZone } from '@angular/core';
import { Network, ConnectionStatus } from '@capacitor/network';
import { BehaviorSubject, Observable } from 'rxjs';
import { NetworkStatus } from '../models';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private networkStatus = new BehaviorSubject<NetworkStatus>({
    connected: true,
    connectionType: 'unknown'
  });

  public networkStatus$: Observable<NetworkStatus> = this.networkStatus.asObservable();

  constructor(private ngZone: NgZone) {
    this.initNetworkListener();
  }

  /**
   * Initialize network status listener
   */
  private async initNetworkListener(): Promise<void> {
    try {
      // Get initial status
      const status = await Network.getStatus();
      this.updateNetworkStatus(status);

      // Listen for changes
      Network.addListener('networkStatusChange', (status) => {
        this.ngZone.run(() => {
          this.updateNetworkStatus(status);
        });
      });
    } catch (error) {
      console.error('Error initializing network listener:', error);
      // Assume online if we can't detect
      this.networkStatus.next({ connected: true, connectionType: 'unknown' });
    }
  }

  /**
   * Update network status
   */
  private updateNetworkStatus(status: ConnectionStatus): void {
    const networkStatus: NetworkStatus = {
      connected: status.connected,
      connectionType: status.connectionType
    };

    console.log('Network status changed:', networkStatus);
    this.networkStatus.next(networkStatus);
  }

  /**
   * Check if currently online
   */
  async isOnline(): Promise<boolean> {
    try {
      const status = await Network.getStatus();
      return status.connected;
    } catch (error) {
      console.error('Error checking network status:', error);
      return true; // Assume online on error
    }
  }

  /**
   * Get current network status synchronously
   */
  getCurrentStatus(): NetworkStatus {
    return this.networkStatus.value;
  }

  /**
   * Get connection type
   */
  async getConnectionType(): Promise<string> {
    try {
      const status = await Network.getStatus();
      return status.connectionType;
    } catch (error) {
      return 'unknown';
    }
  }
}
