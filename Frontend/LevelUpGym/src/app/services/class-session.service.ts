import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Entrenador } from './entrenador.service';

export interface EntrenadorBasico {
  idEmpleado: number;
  nombreCompleto: string;
}

export interface ClassSession {
  idClass: number;
  nombre: string;
  fecha: string; // Ej: "18 de Agosto, 2026"
  hora: string;  // Ej: "09:00 AM"
  capacidadMaxima: number;
  inscritos: number;
  estado: string;
  entrenador: EntrenadorBasico;
  inscrito: boolean;
}

export interface CreateClassSession {
  idEntrenador: number;
  nombre: string;
  fecha: string; // "yyyy-MM-dd"
  horaInicio: string; // "HH:mm"
  capacidadMaxima: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClassSessionService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5143/api/classsessions';

  getClasses(): Observable<ClassSession[]> {
    return this.http.get<ClassSession[]>(this.apiUrl);
  }

  createClass(sessionData: CreateClassSession): Observable<ClassSession> {
    return this.http.post<ClassSession>(this.apiUrl, sessionData);
  }

  deleteClass(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  enroll(idClass: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${idClass}/enroll`, {});
  }

  unenroll(idClass: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${idClass}/enroll`);
  }
}
