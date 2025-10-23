import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { AlertService, AlertCategory } from '../../services/alert.service';
import { API_BASE_URL } from '../../config';

@Component({
  selector: 'app-alert-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alert-create.component.html',
  styleUrl: './alert-create.component.css'
})
export class AlertCreateComponent implements OnInit, OnDestroy {
  alertForm: FormGroup;
  categories: AlertCategory[] = [];
  isSubmitting: boolean = false;
  apiMessage: string | null = null;
  isSuccess: boolean = false;
  selectedImage: File | null = null;
  imagePreviewUrl: string | null = null;
  
  private routeSubscription: Subscription | undefined;
  private readonly apiUrl = API_BASE_URL;

  selectedLatitude: number | null = null;
  selectedLongitude: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.alertForm = this.fb.group({
      category: ['', Validators.required], // Cambiado de null a ''
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.required],
      latitude: [{ value: null, disabled: true }, Validators.required],
      longitude: [{ value: null, disabled: true }, Validators.required]
      // Removido el campo 'icon' que no existe en el backend
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      const lat = params['lat'];
      const lng = params['lng'];
      
      if (lat && lng) {
        this.selectedLatitude = parseFloat(lat);
        this.selectedLongitude = parseFloat(lng);
        this.alertForm.patchValue({
          latitude: this.selectedLatitude,
          longitude: this.selectedLongitude
        });
        this.apiMessage = null; 
      } else {
        console.warn("Coordinates missing in URL.");
        this.router.navigate(['/map'], { 
          replaceUrl: true, 
          queryParams: { error: 'select_location' } 
        });
      }
    });
  }
  
  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
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
      
      if (file.size > 5 * 1024 * 1024) {
        this.apiMessage = 'La imagen debe ser menor a 5MB.';
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
    this.markAllControlsAsDirty(this.alertForm);

    if (this.alertForm.invalid) {
      this.apiMessage = 'Por favor, completa todos los campos requeridos.';
      this.isSuccess = false;
      return;
    }

    this.isSubmitting = true;
    this.apiMessage = null;

    const rawData = this.alertForm.getRawValue();

    if (this.selectedImage) {
      const formData = new FormData();
      formData.append('category', rawData.category.toString());
      formData.append('title', rawData.title);
      formData.append('description', rawData.description);
      formData.append('latitude', rawData.latitude.toString());
      formData.append('longitude', rawData.longitude.toString());
      formData.append('image', this.selectedImage);

      // Usar AlertService en lugar de HttpClient directo
      this.alertService.createAlert(formData as any).subscribe({
        next: () => {
          this.isSuccess = true;
          this.apiMessage = 'Alerta reportada exitosamente!';
          this.alertForm.reset({
            latitude: rawData.latitude,
            longitude: rawData.longitude,
            category: rawData.category
          });
          this.removeImage();
          this.router.navigate(['/alerts']);
          this.isSubmitting = false;
        },
        error: (err) => {
          this.isSuccess = false;
          const errorDetail = (err as HttpErrorResponse).error?.detail || "Verifica tu sesión o datos de entrada.";
          this.apiMessage = `Error al enviar la alerta: ${errorDetail}`;
          this.isSubmitting = false;
        }
      });
    } else {
      const payload = {
        category: rawData.category,
        title: rawData.title,
        description: rawData.description,
        latitude: rawData.latitude,
        longitude: rawData.longitude,
      };

      // Usar AlertService en lugar de HttpClient directo
      this.alertService.createAlert(payload).subscribe({
        next: () => {
          this.isSuccess = true;
          this.apiMessage = 'Alerta reportada exitosamente!';
          this.alertForm.reset({
            latitude: rawData.latitude,
            longitude: rawData.longitude,
            category: rawData.category
          });
          this.router.navigate(['/alerts']);
          this.isSubmitting = false;
        },
        error: (err) => {
          this.isSuccess = false;
          const errorDetail = (err as HttpErrorResponse).error?.detail || "Verifica tu sesión o datos de entrada.";
          this.apiMessage = `Error al enviar la alerta: ${errorDetail}`;
          this.isSubmitting = false;
        }
      });
    }
  }

  private markAllControlsAsDirty(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control) {
        control.markAsDirty();
        control.updateValueAndValidity();
      }
    });
  }

  // Reemplazar fetchCategories por loadCategories usando AlertService
private loadCategories(): void {
  console.log('Token en localStorage:', localStorage.getItem('auth_token'));
  console.log('Usuario autenticado:', this.authService.isAuthenticated());
  
  this.alertService.getAlertCategories().subscribe({
    next: (categories) => {
      console.log('Categorías cargadas exitosamente:', categories);
      this.categories = categories;
    },
    error: (error: HttpErrorResponse) => {
      console.error('Error completo:', error);
      console.log('Headers enviados:', error.headers);
      this.apiMessage = `Error al cargar categorías. (Estado: ${error.status})`;
      this.isSuccess = false;
      
      // Si es error 401, redirigir al login
      if (error.status === 401) {
        this.authService.logout();
      }
    }
  });
}

  getSelectedCategory(): AlertCategory | undefined {
    const categoryKey = this.alertForm.get('category')?.value;
    return this.categories.find(cat => cat.key === categoryKey);
  }

  
}