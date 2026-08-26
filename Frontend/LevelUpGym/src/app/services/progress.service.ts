import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProgressReport {
  idProgreso: number;
  idCliente: number;
  peso: number;
  altura: string;
  imc: string;
  porcentajeGrasa?: number | null;
  cintura?: number | null;
  pecho?: number | null;
  brazo?: number | null;
  pierna?: number | null;
  fechaMedicion?: string | null;
  createdAt?: string | null;
}

export interface CreateProgressPayload {
  peso: number;
  altura: number;
  porcentajeGrasa?: number | null;
  cintura?: number | null;
  pecho?: number | null;
  brazo?: number | null;
  pierna?: number | null;
  fechaMedicion?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5143/api/progress';

  getHistory(): Observable<ProgressReport[]> {
    return this.http.get<ProgressReport[]>(this.apiUrl);
  }

  getById(id: number): Observable<ProgressReport> {
    return this.http.get<ProgressReport>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateProgressPayload): Observable<ProgressReport> {
    return this.http.post<ProgressReport>(this.apiUrl, payload);
  }

  update(id: number, payload: CreateProgressPayload): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
