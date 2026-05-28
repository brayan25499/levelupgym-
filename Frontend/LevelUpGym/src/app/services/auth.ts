import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  email: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5143/api/auth';
  
  currentUser = signal<AuthResponse | null>(this.getUserFromStorage());

  private getUserFromStorage(): AuthResponse | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  login(credentials: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('user', JSON.stringify(response));
        this.currentUser.set(response);
      })
    );
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => {
        localStorage.setItem('user', JSON.stringify(response));
        this.currentUser.set(response);
      })
    );
  }

  logout() {
    localStorage.removeItem('user');
    this.currentUser.set(null);
  }

  forgotPassword(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, data);
  }

  getToken(): string | null {
    return this.currentUser()?.token || null;
  }

  getProfile(): Observable<any> {
    return this.http.get<any>('http://localhost:5143/api/clients/profile');
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put<any>('http://localhost:5143/api/clients/profile', data);
  }

  deleteAccount(): Observable<any> {
    return this.http.delete<any>('http://localhost:5143/api/clients/profile');
  }
}
