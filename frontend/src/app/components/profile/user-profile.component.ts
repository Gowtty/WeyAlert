import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { AlertService, Alert } from '../../services/alert.service';
import { API_BASE_URL } from '../../config';

interface UserProfile {
  user: User;
  phone: string;
  avatar: string | null;
  alerts_reported: number;
  alerts_resolved: number;
  reputation_points: number;
  created_at: string;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css'
})
export class UserProfileComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  privacyForm: FormGroup;
  
  currentUser: User | null = null;
  userProfile: UserProfile | null = null;
  userAlerts: Alert[] = [];
  
  selectedImage: File | null = null;
  imagePreviewUrl: string | null = null;
  
  isEditing = false;
  isSubmitting = false;
  isPasswordSubmitting = false;
  isLoading = true;
  
  message: string | null = null;
  isSuccess: boolean = false;

  private readonly apiUrl = API_BASE_URL;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public router: Router,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      first_name: [''],
      last_name: ['']
    });

    this.passwordForm = this.fb.group({
      current_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]]
    });

    this.privacyForm = this.fb.group({
      location_access: [false],
      share_location: [false]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.loadUserProfile();
      this.loadUserAlerts();
    } else {
      this.router.navigate(['/login']);
    }
  }

loadUserProfile(): void {
  const headers = this.getAuthHeaders();
  console.log('Headers de autenticación:', headers); // Debug
  
  this.http.get<UserProfile>(`${this.apiUrl}/user/profile/`, { 
    headers: headers 
  }).subscribe({
    next: (profile) => {
      console.log('Perfil cargado exitosamente:', profile); // Debug
        this.userProfile = profile;
        this.profileForm.patchValue({
          email: profile.user.email,
          phone: profile.phone || '',
          first_name: profile.user.first_name || '',
          last_name: profile.user.last_name || ''
        });
        
        if (profile.avatar) {
          this.imagePreviewUrl = `${this.apiUrl}${profile.avatar}`;
        }
        
        this.isLoading = false;
      },
       error: (error) => {
      console.error('Error detallado al cargar perfil:', error); // Debug
        this.isLoading = false;
        this.message = 'Error al cargar el perfil';
        this.isSuccess = false;
        
        // Si hay error de autenticación, redirigir al login
        if (error.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  // Método para obtener headers con autenticación
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    });
  }

  loadUserAlerts(): void {
    this.alertService.getMyAlerts().subscribe({
      next: (alerts) => {
        this.userAlerts = alerts;
      },
      error: (error) => {
        console.error('Error loading user alerts', error);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      if (!file.type.startsWith('image/')) {
        this.message = 'Por favor selecciona un archivo de imagen válido.';
        this.isSuccess = false;
        return;
      }
      
      this.selectedImage = file;
      
      if (this.imagePreviewUrl) {
        URL.revokeObjectURL(this.imagePreviewUrl);
      }
      this.imagePreviewUrl = URL.createObjectURL(file);
      this.message = null;
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('avatar-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.message = 'Por favor, completa todos los campos requeridos.';
      this.isSuccess = false;
      return;
    }

    this.isSubmitting = true;
    this.message = null;

    const profileData = this.profileForm.value;

    if (this.selectedImage) {
      const formData = new FormData();
      formData.append('email', profileData.email);
      formData.append('phone', profileData.phone);
      formData.append('first_name', profileData.first_name);
      formData.append('last_name', profileData.last_name);
      formData.append('avatar', this.selectedImage);

      this.http.patch(`${this.apiUrl}/user/profile/`, formData).subscribe({
        next: (response: any) => {
          this.handleProfileUpdateSuccess(response);
          this.reloadUserStatistics();
        },
        error: (error) => {
          this.handleError(error, 'Error al actualizar el perfil');
        }
      });
    } else {
      this.http.patch(`${this.apiUrl}/user/profile/`, profileData).subscribe({
        next: (response: any) => {
          this.handleProfileUpdateSuccess(response);
          this.reloadUserStatistics();
        },
        error: (error) => {
          this.handleError(error, 'Error al actualizar el perfil');
        }
      });
    }
  }

  private handleProfileUpdateSuccess(response: any): void {
    this.isSubmitting = false;
    this.isSuccess = true;
    this.message = 'Perfil actualizado correctamente';
    this.isEditing = false;
    
    // Update local user data
    if (response.user) {
      this.currentUser = response.user;
      // Update auth service if needed
    }
    
    // Reload profile to get updated data
    this.loadUserProfile();
    this.reloadUserStatistics();
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.message = 'Por favor, completa todos los campos de contraseña.';
      this.isSuccess = false;
      return;
    }

    const passwordData = this.passwordForm.value;
    if (passwordData.new_password !== passwordData.confirm_password) {
      this.message = 'Las contraseñas nuevas no coinciden.';
      this.isSuccess = false;
      return;
    }

    this.isPasswordSubmitting = true;
    this.message = null;

    this.http.post(`${this.apiUrl}/user/change-password/`, {
      current_password: passwordData.current_password,
      new_password: passwordData.new_password
    }).subscribe({
      next: () => {
        this.isPasswordSubmitting = false;
        this.isSuccess = true;
        this.message = 'Contraseña cambiada correctamente';
        this.passwordForm.reset();
      },
      error: (error) => {
        this.handleError(error, 'Error al cambiar la contraseña');
        this.isPasswordSubmitting = false;
      }
    });
  }

  updatePrivacySettings(): void {
    const privacyData = this.privacyForm.value;
    // Here you would typically send this to your backend
    console.log('Privacy settings updated:', privacyData);
    this.message = 'Configuración de privacidad actualizada';
    this.isSuccess = true;
  }

  private handleError(error: any, defaultMessage: string): void {
    this.isSubmitting = false;
    this.isSuccess = false;
    this.message = error.error?.message || error.error?.detail || defaultMessage;
  }

  getStatusBadgeClass(status: string | undefined): string {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return '';
    }
  }

  // Método para recargar estadísticas
  private reloadUserStatistics(): void {
    if (this.userProfile) {
      // Forzar recarga del perfil para obtener estadísticas actualizadas
      this.loadUserProfile();
    }
  }
}