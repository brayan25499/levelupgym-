import { Injectable, signal } from '@angular/core';

export interface AlertState {
  type: 'success' | 'error' | 'info' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
  onOk?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  currentAlert = signal<AlertState | null>(null);

  success(message: string, title: string = '¡Éxito!', onOk?: () => void) {
    this.currentAlert.set({ type: 'success', title, message, onOk });
  }

  error(message: string, title: string = '¡Error!', onOk?: () => void) {
    this.currentAlert.set({ type: 'error', title, message, onOk });
  }

  info(message: string, title: string = 'Información', onOk?: () => void) {
    this.currentAlert.set({ type: 'info', title, message, onOk });
  }

  confirm(message: string, onConfirm: () => void, title: string = '¿Estás seguro?') {
    this.currentAlert.set({ type: 'confirm', title, message, onConfirm });
  }

  close() {
    this.currentAlert.set(null);
  }
}
