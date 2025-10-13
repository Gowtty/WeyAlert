import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../config'; // Import the correct base URL constant

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // CORRECTED BASE URL: Set to the imported constant, which should resolve to 'http://localhost:8000/api'
  private apiUrl = API_BASE_URL; 
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredUser();
  }

  private loadStoredUser() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  register(userData: any): Observable<AuthResponse> {
    // Correct Endpoint: http://localhost:8000/api/register/
    return this.http.post<AuthResponse>(`${this.apiUrl}/register/`, userData)
      .pipe(tap(response => this.handleAuthResponse(response)));
  }

  login(credentials: { username: string; password: string }): Observable<AuthResponse> {
    // Correct Endpoint: http://localhost:8000/api/login/
    return this.http.post<AuthResponse>(`${this.apiUrl}/login/`, credentials)
      .pipe(tap(response => this.handleAuthResponse(response)));
  }

  logout(): Observable<any> {
    // Correct Endpoint: http://localhost:8000/api/logout/
    // Note: Your Django backend requires the Authorization header for this endpoint (handled by interceptor)
    return this.http.post(`${this.apiUrl}/logout/`, {})
      .pipe(tap(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
      }));
  }

  private handleAuthResponse(response: AuthResponse) {
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}