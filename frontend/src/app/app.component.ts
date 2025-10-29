import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './services/auth.service';
import { ToastComponent } from './components/toast/toast.component';
import { API_BASE_URL } from './config';

interface UserProfile {
  user: any;
  avatar_url: string | null;
  phone: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'WeyAlert';
  userAvatar: string | null = null;
  username: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.loadUserProfile();
    }
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  loadUserProfile(): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Token ${token}`
    });

    this.http.get<UserProfile>(`${API_BASE_URL}/user/profile/`, { headers }).subscribe({
      next: (profile) => {
        this.userAvatar = profile.avatar_url || 'assets/default-avatar.svg';
        this.username = profile.user?.username || 'Usuario';
      },
      error: (error) => {
        console.error('Error loading user profile for header', error);
        this.userAvatar = 'assets/default-avatar.svg';
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.userAvatar = null;
    this.username = null;
  }
}