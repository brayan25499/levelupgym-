import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GoalTypeItem {
  idTipoObjetivo: number;
  nombre: string;
  descripcion?: string | null;
  unidad: string;
  tipoDato: string;
  direccion: string;
  activo: boolean;
}

export interface UserGoalDto {
  idObjetivo: number;
  idCliente: number;
  idTipoObjetivo: number;
  nombreTipoObjetivo: string;
  unidad: string;
  direccion: string;
  valorMeta: number;
  valorInicial?: number | null;
  valorActual?: number | null;
  porcentajeProgreso: number;
  fechaInicio: string;
  fechaLimite?: string | null;
  estado: string;
  descripcion?: string | null;
  createdAt?: string | null;
}

export interface CreateGoalPayload {
  idTipoObjetivo: number;
  valorMeta: number;
  fechaLimite?: string | null;
  descripcion?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class GoalService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5143/api/goals';

  getGoalTypes(): Observable<GoalTypeItem[]> {
    return this.http.get<GoalTypeItem[]>(`${this.apiUrl}/types`);
  }

  getGoals(): Observable<UserGoalDto[]> {
    return this.http.get<UserGoalDto[]>(this.apiUrl);
  }

  createGoal(payload: CreateGoalPayload): Observable<UserGoalDto> {
    return this.http.post<UserGoalDto>(this.apiUrl, payload);
  }

  deleteGoal(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
