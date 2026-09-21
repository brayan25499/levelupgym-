import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Entrenador {
  idEmpleado: number;
  nombre: string;
  apellidos: string;
  iniciales: string;
  especialidad: string;
  descripcion: string;
  roles: string[];
}

export interface EntrenadorAdmin {
  idEmpleado: number;
  nombre: string;
  apellidos: string;
  especialidad: string;
  descripcion: string;
  salarioBase: number;
  fechaContratacion: string; // yyyy-MM-dd
  estado: string;
}

export interface CreateEntrenador {
  nombre: string;
  apellidos: string;
  especialidad: string;
  descripcion: string;
  salarioBase: number;
  fechaContratacion: string; // yyyy-MM-dd
}

export interface UpdateEntrenador {
  nombre: string;
  apellidos: string;
  especialidad: string;
  descripcion: string;
  salarioBase: number;
  fechaContratacion: string; // yyyy-MM-dd
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class EntrenadorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/entrenadores`;

  getEntrenadores(): Observable<Entrenador[]> {
    return this.http.get<Entrenador[]>(this.apiUrl);
  }

  getEntrenadoresAdmin(): Observable<EntrenadorAdmin[]> {
    return this.http.get<EntrenadorAdmin[]>(`${this.apiUrl}/admin`);
  }

  getEntrenadorById(id: number): Observable<EntrenadorAdmin> {
    return this.http.get<EntrenadorAdmin>(`${this.apiUrl}/${id}`);
  }

  createEntrenador(data: CreateEntrenador): Observable<EntrenadorAdmin> {
    return this.http.post<EntrenadorAdmin>(this.apiUrl, data);
  }

  updateEntrenador(id: number, data: UpdateEntrenador): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteEntrenador(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}