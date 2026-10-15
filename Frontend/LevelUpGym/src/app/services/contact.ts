import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContactMessage {
  nombre: string;
  correo: string;
  asunto: string;
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/contacto`;

  enviarMensaje(data: ContactMessage): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }
}