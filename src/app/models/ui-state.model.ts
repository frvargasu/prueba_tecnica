/**
 * UI state enum for views
 */
export enum ViewState {
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  EMPTY = 'empty',
  OFFLINE = 'offline'
}

/**
 * Error information for display
 */
export interface ErrorInfo {
  message: string;
  code?: string;
  retryable: boolean;
}

/**
 * Network status
 */
export interface NetworkStatus {
  connected: boolean;
  connectionType: string;
}
