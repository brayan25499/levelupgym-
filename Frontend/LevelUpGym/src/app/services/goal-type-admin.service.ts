import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GoalTypeAdmin {
  idTipoObjetivo: number;
  nombre: string;
  descripcion?: string | null;
  unidad: string;
  tipoDato: string;
  direccion: string;
  activo: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateGoalTypePayload {
  nombre: string;
  descripcion?: string | null;
  unidad: string;
  tipoDato: string;
  direccion: string;
  activo: boolean;
}

export interface UpdateGoalTypePayload {
  nombre: string;
  descripcion?: string | null;
  unidad: string;
  tipoDato: string;
  direccion: string;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GoalTypeAdminService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5143/api/admin/goaltypes';

  getAll(): Observable<GoalTypeAdmin[]> {
    return this.http.get<GoalTypeAdmin[]>(this.apiUrl);
  }

  create(payload: CreateGoalTypePayload): Observable<GoalTypeAdmin> {
    return this.http.post<GoalTypeAdmin>(this.apiUrl, payload);
  }

  update(id: number, payload: UpdateGoalTypePayload): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload);
  }

  toggleActive(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/toggle-active`, {});
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
