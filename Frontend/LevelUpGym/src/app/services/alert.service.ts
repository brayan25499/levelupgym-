import { Injectable, signal } from '@angular/core';

export interface AlertState {
  type: 'success' | 'error' | 'info' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  currentAlert = signal<AlertState | null>(null);

  success(message: string, title: string = '¡Éxito!') {
    this.currentAlert.set({ type: 'success', title, message });
  }

  error(message: string, title: string = '¡Error!') {
    this.currentAlert.set({ type: 'error', title, message });
  }

  info(message: string, title: string = 'Información') {
    this.currentAlert.set({ type: 'info', title, message });
  }

  confirm(message: string, onConfirm: () => void, title: string = '¿Estás seguro?') {
    this.currentAlert.set({ type: 'confirm', title, message, onConfirm });
  }

  close() {
    this.currentAlert.set(null);
  }
}
