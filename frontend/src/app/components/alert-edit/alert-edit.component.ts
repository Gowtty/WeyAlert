import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AlertService, Alert } from '../../services/alert.service';
import { API_BASE_URL } from '../../config';

interface AlertCategory {
  key: string;
  name: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-alert-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alert-edit.component.html',
  styleUrl: './alert-edit.component.css'
})
export class AlertEditComponent implements OnInit {
  alertForm: FormGroup;
  categories: AlertCategory[] = [];
  isSubmitting: boolean = false;
  apiMessage: string | null = null;
  isSuccess: boolean = false;
  selectedImage: File | null = null;
  imagePreviewUrl: string | null = null;
  alertId: number | null = null;
  currentAlert: Alert | null = null;

  private readonly apiUrl = API_BASE_URL;

 constructor(
  private fb: FormBuilder,
  private route: ActivatedRoute,
  public router: Router,  // Cambiado a public
  private http: HttpClient,
  private alertService: AlertService
) {
    this.alertForm = this.fb.group({
      category: [null, Validators.required],
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.required],
      status: ['active', Validators.required]
    });
  }

  ngOnInit(): void {
    // Check authentication first - check the correct key
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    const user = localStorage.getItem('current_user') || localStorage.getItem('user');
    
    console.log('Auth check - Token exists:', !!token);
    console.log('Auth check - User exists:', !!user);
    
    if (!token || !user) {
      console.log('No auth found, redirecting to login');
      console.log('Token key "auth_token":', localStorage.getItem('auth_token'));
      console.log('Token key "token":', localStorage.getItem('token'));
      this.router.navigate(['/login']);
      return;
    }
    
    this.alertId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.alertId || isNaN(this.alertId)) {
      console.error('Invalid alert ID');
      this.router.navigate(['/alerts']);
      return;
    }
    
    this.fetchCategories();
    this.loadAlert();
  }

  loadAlert(): void {
    if (this.alertId) {
      this.alertService.getAlert(this.alertId).subscribe({
        next: (alert) => {
          this.currentAlert = alert;
          
          // Check ownership - try both possible localStorage keys
          const userStr = localStorage.getItem('current_user') || localStorage.getItem('user');
          const currentUser = userStr ? JSON.parse(userStr) : null;
          
          console.log('Current user:', currentUser);
          console.log('Alert user:', alert.user);
          
          if (!currentUser || !alert.user || alert.user.id !== currentUser.id) {
            this.apiMessage = 'No tienes permisos para editar esta alerta';
            this.isSuccess = false;
            setTimeout(() => this.router.navigate(['/alerts']), 2000);
            return;
          }
          
          this.alertForm.patchValue({
            category: alert.category,
            title: alert.title,
            description: alert.description,
            status: alert.status || 'active'
          });
          
          if (alert.image) {
            // Handle both relative and absolute URLs
            if (alert.image.startsWith('http')) {
              this.imagePreviewUrl = alert.image;
            } else {
              this.imagePreviewUrl = `${this.apiUrl}${alert.image}`;
            }
          }
        },
        error: (error) => {
          console.error('Error loading alert:', error);
          this.apiMessage = 'Error al cargar la alerta';
          this.isSuccess = false;
          setTimeout(() => this.router.navigate(['/alerts']), 2000);
        }
      });
    }
  }

  fetchCategories(): void {
    this.alertService.getAlertCategories().subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (error) => {
        this.apiMessage = 'Error al cargar categorías';
        this.isSuccess = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      if (!file.type.startsWith('image/')) {
        this.apiMessage = 'Por favor selecciona un archivo de imagen válido.';
        this.isSuccess = false;
        return;
      }
      
      this.selectedImage = file;
      
      if (this.imagePreviewUrl) {
        URL.revokeObjectURL(this.imagePreviewUrl);
      }
      this.imagePreviewUrl = URL.createObjectURL(file);
      this.apiMessage = null;
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('image-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  removeImage(): void {
    this.selectedImage = null;
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = null;
    }
    const fileInput = document.getElementById('image-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

onSubmit(): void {
  if (this.alertForm.invalid || !this.alertId || !this.currentAlert) {
    this.apiMessage = 'Por favor, completa todos los campos requeridos.';
    this.isSuccess = false;
    return;
  }

  this.isSubmitting = true;
  this.apiMessage = null;

  const alertData: any = {
    category: this.alertForm.get('category')?.value,
    title: this.alertForm.get('title')?.value,
    description: this.alertForm.get('description')?.value,
    status: this.alertForm.get('status')?.value,
    latitude: this.currentAlert.latitude,
    longitude: this.currentAlert.longitude
  };

  if (this.selectedImage) {
    const formData = new FormData();
    formData.append('category', alertData.category.toString());
    formData.append('title', alertData.title);
    formData.append('description', alertData.description);
    formData.append('status', alertData.status);
    formData.append('latitude', alertData.latitude.toString());
    formData.append('longitude', alertData.longitude.toString());
    formData.append('image', this.selectedImage);

    this.alertService.updateAlert(this.alertId, formData).subscribe({
      next: () => this.handleSuccess(),
      error: (error) => this.handleError(error)
    });
  } else {
    this.alertService.updateAlert(this.alertId, alertData).subscribe({
      next: () => this.handleSuccess(),
      error: (error) => this.handleError(error)
    });
  }
}

private handleSuccess(): void {
  this.isSuccess = true;
  this.apiMessage = 'Alerta actualizada exitosamente!';
  setTimeout(() => {
    this.router.navigate(['/alerts']);
  }, 2000);
  this.isSubmitting = false;
}

private handleError(error: any): void {
  this.isSuccess = false;
  this.apiMessage = 'Error al actualizar la alerta';
  this.isSubmitting = false;
}
}