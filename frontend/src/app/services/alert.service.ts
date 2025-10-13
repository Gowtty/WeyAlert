import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AlertCategory {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface Alert {
  id?: number;
  user?: any;
  category: number;
  category_detail?: AlertCategory;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  image?: File | string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) { }

  getCategories(): Observable<AlertCategory[]> {
    return this.http.get<AlertCategory[]>(`${this.apiUrl}/categories/`);
  }

  getAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.apiUrl}/alerts/`);
  }

  getAlert(id: number): Observable<Alert> {
    return this.http.get<Alert>(`${this.apiUrl}/alerts/${id}/`);
  }

  getNearbyAlerts(lat: number, lng: number, radius: number = 5): Observable<Alert[]> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lng', lng.toString())
      .set('radius', radius.toString());
    
    return this.http.get<Alert[]>(`${this.apiUrl}/alerts/nearby/`, { params });
  }

  getMyAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.apiUrl}/alerts/my_alerts/`);
  }

  createAlert(alertData: FormData): Observable<Alert> {
    return this.http.post<Alert>(`${this.apiUrl}/alerts/`, alertData);
  }

  updateAlert(id: number, alertData: Partial<Alert>): Observable<Alert> {
    return this.http.patch<Alert>(`${this.apiUrl}/alerts/${id}/`, alertData);
  }

  deleteAlert(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/alerts/${id}/`);
  }
}