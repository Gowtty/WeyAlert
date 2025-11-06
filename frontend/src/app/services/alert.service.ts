import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config';

export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  reputation_points?: number;
}

export interface Alert {
  id?: number;
  title: string;
  description: string;
  category: string;  // Changed from number to string (category key)
  category_detail?: AlertCategory;
  latitude: number;
  longitude: number;
  image?: string;
  status?: string;
  status_display?: string;
  user?: User;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  likes_count?: number;
  dislikes_count?: number;
  user_reaction?: 'like' | 'dislike' | null;
  comments?: AlertComment[];
  comments_count?: number;
}

export interface AlertComment {
  id?: number;
  user: User;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface AlertCategory {
  key: string;  // Added key field
  name: string;
  description: string;
  icon: string;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private apiUrl = API_BASE_URL;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.apiUrl}/alerts/`, { 
      headers: this.getAuthHeaders() 
    });
  }

  getMyAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.apiUrl}/alerts/my_alerts/`, { 
      headers: this.getAuthHeaders() 
    });
  }

  getAlertCategories(): Observable<AlertCategory[]> {
    // Using new categories endpoint that returns dictionary-based categories
    return this.http.get<AlertCategory[]>(`${this.apiUrl}/categories/`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError((error: HttpErrorResponse) => { // ✅ Especificar tipo
        if (error.status === 401) {
          this.authService.logout();
        }
        return throwError(() => error); // ✅ Usar función factory
      })
    );
  }

  createAlert(alert: Alert | FormData): Observable<Alert> {
    let headers = this.getAuthHeaders();
    
    // Si es FormData (con imagen), quitar el Content-Type para que el navegador lo establezca
    if (alert instanceof FormData) {
      headers = headers.delete('Content-Type');
    }
    
    return this.http.post<Alert>(`${this.apiUrl}/alerts/`, alert, { 
      headers: headers
    });
  }

  updateAlert(id: number, alert: Alert | FormData): Observable<Alert> {
    let headers = this.getAuthHeaders();
    
    // Si es FormData (con imagen), quitar el Content-Type para que el navegador lo establezca
    if (alert instanceof FormData) {
      headers = headers.delete('Content-Type');
    }
    
    return this.http.put<Alert>(`${this.apiUrl}/alerts/${id}/`, alert, { 
      headers: headers
    });
  }

  deleteAlert(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/alerts/${id}/`, { 
      headers: this.getAuthHeaders() 
    });
  }

  getAlert(id: number): Observable<Alert> {
    // Don't require auth for getting a single alert (it's a public endpoint)
    return this.http.get<Alert>(`${this.apiUrl}/alerts/${id}/`);
  }

  reactToAlert(alertId: number, reactionType: 'like' | 'dislike' | 'remove'): Observable<Alert> {
    const headers = this.getAuthHeaders();
    return this.http.post<Alert>(
      `${this.apiUrl}/alerts/${alertId}/react/`,
      { reaction_type: reactionType },
      { headers }
    ).pipe(
      catchError((error) => {
        if (error.status === 401) {
          this.authService.logout();
        }
        return throwError(() => error);
      })
    );
  }

  closeAlert(alertId: number): Observable<Alert> {
    const headers = this.getAuthHeaders();
    return this.http.post<Alert>(
      `${this.apiUrl}/alerts/${alertId}/close/`,
      {},
      { headers }
    ).pipe(
      catchError((error) => {
        if (error.status === 401) {
          this.authService.logout();
        }
        return throwError(() => error);
      })
    );
  }

  getAlertComments(alertId: number): Observable<AlertComment[]> {
    return this.http.get<AlertComment[]>(
      `${this.apiUrl}/alerts/${alertId}/comments/`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError((error) => {
        if (error.status === 401) {
          this.authService.logout();
        }
        return throwError(() => error);
      })
    );
  }

  addAlertComment(alertId: number, text: string): Observable<AlertComment> {
    const headers = this.getAuthHeaders();
    return this.http.post<AlertComment>(
      `${this.apiUrl}/alerts/${alertId}/comments/`,
      { text },
      { headers }
    ).pipe(
      catchError((error) => {
        if (error.status === 401) {
          this.authService.logout();
        }
        return throwError(() => error);
      })
    );
  }
}