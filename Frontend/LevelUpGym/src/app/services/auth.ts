import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  email: string;
  token: string;
  refreshToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5143/api/auth';
  
  currentUser = signal<AuthResponse | null>(this.getUserFromStorage());

  private getUserFromStorage(): AuthResponse | null {
    const userLocal = localStorage.getItem('user');
    if (userLocal) return JSON.parse(userLocal);
    const userSession = sessionStorage.getItem('user');
    return userSession ? JSON.parse(userSession) : null;
  }

  login(credentials: any, rememberMe: boolean = false): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (rememberMe) {
          localStorage.setItem('user', JSON.stringify(response));
        } else {
          sessionStorage.setItem('user', JSON.stringify(response));
        }
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
    const user = this.currentUser();
    if (user && user.refreshToken) {
      this.http.post(`${this.apiUrl}/logout-session`, { refreshToken: user.refreshToken }).subscribe();
    }
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    this.currentUser.set(null);
  }

  renewToken(refreshToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap(response => {
        const isRemembered = localStorage.getItem('user') !== null;
        if (isRemembered) {
          localStorage.setItem('user', JSON.stringify(response));
        } else {
          sessionStorage.setItem('user', JSON.stringify(response));
        }
        this.currentUser.set(response);
      })
    );
  }

  forgotPassword(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, data);
  }

  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/google`, { idToken }).pipe(
      tap(response => {
        localStorage.setItem('user', JSON.stringify(response));
        this.currentUser.set(response);
      })
    );
  }

  requestResetPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/request-reset-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, { token, newPassword });
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
