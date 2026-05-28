import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Membership {
  idMembresia: number;
  nombre: string;
  precio: number;
  descripcion: string;
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5143/api/memberships';

  getMemberships(): Observable<Membership[]> {
    return this.http.get<Membership[]>(this.apiUrl);
  }

  buyMembership(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/purchase/${id}`, {});
  }
}
