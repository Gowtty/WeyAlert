import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../config';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = API_BASE_URL;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Cargar usuario desde localStorage al inicializar
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('current_user');
    if (token && userStr) {
      this.currentUserSubject.next(JSON.parse(userStr));
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login/`, {
      username,
      password
    }).pipe(
      tap(response => {
        this.setToken(response.token);
        this.setCurrentUser(response.user);
      })
    );
  }

register(userData: any): Observable<LoginResponse> {
  return this.http.post<LoginResponse>(`${this.apiUrl}/auth/register/`, userData).pipe(
    tap(response => {
      this.setToken(response.token);
      this.setCurrentUser(response.user);
    })
  );
}
logout(): void {
  const token = this.getToken();
  
  // Limpiar datos locales primero para evitar problemas de UI
  this.clearAuthData();
  this.currentUserSubject.next(null);
  
  if (token) {
    // Intentar logout en el backend (pero no bloquear si falla)
    this.http.post(`${this.apiUrl}/auth/logout/`, {}, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: () => console.log('Logout exitoso en backend'),
      error: (err) => console.error('Error en logout del backend:', err)
    });
  }
  
  // Redirigir al login independientemente del resultado del backend
  this.router.navigate(['/login']);
}

getAuthHeaders(): HttpHeaders {
  const token = this.getToken();
  console.log('Token enviado en headers:', token); // Debug
  return new HttpHeaders({
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json'
  });
}

  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private setCurrentUser(user: User): void {
    localStorage.setItem('current_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private clearAuthData(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  }
}