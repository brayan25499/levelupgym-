import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

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
  private cachedMemberships: Membership[] | null = null;

  getMemberships(): Observable<Membership[]> {
    if (this.cachedMemberships) {
      return of(this.cachedMemberships);
    }
    return this.http.get<Membership[]>(this.apiUrl).pipe(
      tap(data => this.cachedMemberships = data)
    );
  }

  buyMembership(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/purchase/${id}`, {});
  }
}
