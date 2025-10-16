import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  registerForm: FormGroup;
  isSubmitting = false;
  authError: string | null = null;
  isLoginMode = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Formulario de Login
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    // Formulario de Registro
    this.registerForm = this.fb.group({
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Verificar si estamos en modo registro desde query params
    this.route.queryParams.subscribe(params => {
      this.isLoginMode = params['mode'] !== 'register';
    });
  }

  private passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password');
    const password_confirm = control.get('password_confirm');
    
    if (!password || !password_confirm) return null;
    
    return password.value === password_confirm.value ? null : { mismatch: true };
  }

  showLogin(): void {
    this.isLoginMode = true;
    this.authError = null;
    this.loginForm.reset();
    this.updateQueryParams();
  }

  showRegister(): void {
    this.isLoginMode = false;
    this.authError = null;
    this.registerForm.reset();
    this.updateQueryParams();
  }

  private updateQueryParams(): void {
    const queryParams = this.isLoginMode ? {} : { mode: 'register' };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: 'merge'
    });
  }

  onLoginSubmit(): void {
    if (this.loginForm.valid) {
      this.isSubmitting = true;
      this.authError = null;
      const formData = this.loginForm.value;

      this.authService.login(formData.username, formData.password).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.router.navigate(['/map']);
        },
        error: (error: any) => {
          this.isSubmitting = false;
          this.authError = error.error?.message || 'Error durante el inicio de sesión';
        }
      });
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  onRegisterSubmit(): void {
  if (this.registerForm.valid) {
    this.isSubmitting = true;
    this.authError = null;
    const formData = this.registerForm.value;

    // Verificar que las contraseñas coincidan
    if (formData.password !== formData.password_confirm) {
      this.authError = 'Las contraseñas no coinciden';
      this.isSubmitting = false;
      return;
    }

    // Preparar datos para registro - INCLUIR password_confirm
    const registerData = {
      username: formData.username,
      password: formData.password,
      password_confirm: formData.password_confirm,  // ✅ Añadir este campo
      email: formData.email,
      first_name: formData.first_name || '',
      last_name: formData.last_name || ''
    };

    console.log('Enviando datos de registro:', registerData);

    this.authService.register(registerData).subscribe({
      next: (response) => {
        console.log('Registro exitoso:', response);
        this.isSubmitting = false;
        this.authError = 'Registration successful! You can now log in.';
      },
      error: (error: any) => {
        console.error('Error en registro:', error);
        this.isSubmitting = false;
        this.authError = error.error?.detail || 'Error durante el registro';
      }
    });
  } else {
    this.markFormGroupTouched(this.registerForm);
  }
}

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      control?.updateValueAndValidity();
    });
  }
}