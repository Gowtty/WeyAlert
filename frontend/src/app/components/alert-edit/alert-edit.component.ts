import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AlertService, Alert } from '../../services/alert.service';
import { API_BASE_URL } from '../../config';

interface AlertCategory {
  id: number;
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
    this.alertId = Number(this.route.snapshot.paramMap.get('id'));
    this.fetchCategories();
    this.loadAlert();
  }

  loadAlert(): void {
    if (this.alertId) {
      this.alertService.getAlert(this.alertId).subscribe({
        next: (alert) => {
          this.currentAlert = alert;
          this.alertForm.patchValue({
            category: alert.category,
            title: alert.title,
            description: alert.description,
            status: alert.status
          });
          
          if (alert.image) {
            this.imagePreviewUrl = `${this.apiUrl}${alert.image}`;
          }
        },
        error: (error) => {
          this.apiMessage = 'Error al cargar la alerta';
          this.isSuccess = false;
        }
      });
    }
  }

  fetchCategories(): void {
    this.alertService.getCategories().subscribe({
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
  if (this.alertForm.invalid || !this.alertId) {
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
    status: this.alertForm.get('status')?.value
  };

  if (this.selectedImage) {
    const formData = new FormData();
    formData.append('category', alertData.category.toString());
    formData.append('title', alertData.title);
    formData.append('description', alertData.description);
    formData.append('status', alertData.status);
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