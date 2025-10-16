import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config';

export interface Alert {
  id?: number;
  title: string;
  description: string;
  category: number;
  category_detail?: any;
  latitude: number;
  longitude: number;
  status?: string;
  user?: any;
  created_at?: string;
  updated_at?: string;
}

export interface AlertCategory {
  id: number;
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
    return this.http.get<AlertCategory[]>(`${this.apiUrl}/alert-categories/`, {
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

  updateAlert(id: number, alert: Alert): Observable<Alert> {
    return this.http.put<Alert>(`${this.apiUrl}/alerts/${id}/`, alert, { 
      headers: this.getAuthHeaders() 
    });
  }

  deleteAlert(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/alerts/${id}/`, { 
      headers: this.getAuthHeaders() 
    });
  }

  getAlert(id: number): Observable<Alert> {
    return this.http.get<Alert>(`${this.apiUrl}/alerts/${id}/`, { 
      headers: this.getAuthHeaders() 
    });
  }
}