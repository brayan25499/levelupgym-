import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Entrenador {
  idEmpleado: number;
  nombre: string;
  apellidos: string;
  iniciales: string;
  especialidad: string;
  descripcion: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class EntrenadorService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5143/api/entrenadores';

  getEntrenadores(): Observable<Entrenador[]> {
    return this.http.get<Entrenador[]>(this.apiUrl);
  }
}
