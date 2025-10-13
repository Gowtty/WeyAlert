import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router'; 
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidatorFn } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators'; 

import { AuthService } from '../../services/auth.service';

export function passwordMatchValidator(controlName: string, checkControlName: string): ValidatorFn {
    return (formGroup: AbstractControl): { [key: string]: any } | null => {
        const group = formGroup as FormGroup; 
        const control = group.get(controlName);
        const checkControl = group.get(checkControlName);
        
        const controlValue = control?.value;
        const checkControlValue = checkControl?.value;
        
        
        if (controlValue && checkControlValue && controlValue !== checkControlValue) {
             return { 'mismatch': true };
        }
        
        return null;
    };
}

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule, 
    CommonModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy { 
  isLoginMode: boolean = true;
  loginForm: FormGroup;
  registerForm: FormGroup;
  
  private queryParamsSubscription: Subscription | undefined;
  private validatorSubscription: Subscription | undefined; 
  public authError: string | null = null; 

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private fb: FormBuilder, 
    private authService: AuthService
  ) {

    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(8)]], 
      password_confirm: ['']
    }, { validators: passwordMatchValidator('password', 'password_confirm') });
  }

  ngOnInit(): void {
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      const mode = params['mode'];
      this.isLoginMode = (mode !== 'register');
      this.authError = null; 
    });

    const passwordControl = this.registerForm.get('password');
    const passwordConfirmControl = this.registerForm.get('password_confirm');

    if (passwordControl && passwordConfirmControl) {
      this.validatorSubscription = passwordControl.valueChanges
        .pipe(debounceTime(100))
        .subscribe(() => {
          this.registerForm.updateValueAndValidity({ emitEvent: false });
        });
        
      this.validatorSubscription.add(passwordConfirmControl.valueChanges
        .pipe(debounceTime(100))
        .subscribe(() => {
          this.registerForm.updateValueAndValidity({ emitEvent: false });
        }));
    }
  }

  ngOnDestroy(): void {
    if (this.queryParamsSubscription) {
        this.queryParamsSubscription.unsubscribe();
    }
    if (this.validatorSubscription) {
        this.validatorSubscription.unsubscribe();
    }
  }
  
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      control.markAsDirty(); 
      control.updateValueAndValidity();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // --- View Switching & URL Sync ---

  showLogin(): void {
    this.registerForm.reset(); 
    this.router.navigate([], { relativeTo: this.route, queryParams: { mode: null }, queryParamsHandling: 'merge' });
  }

  showRegister(): void {
    this.loginForm.reset(); 
    this.router.navigate([], { relativeTo: this.route, queryParams: { mode: 'register' }, queryParamsHandling: 'merge' });
  }

  // --- Form Submission Logic ---

  onLoginSubmit(): void {
    this.authError = null;
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm); 
      return;
    }

    const credentials = this.loginForm.getRawValue();

    this.authService.login(credentials).subscribe({
      next: () => {
        this.router.navigate(['/map']); 
      },
      error: (err) => {
        this.authError = err.error?.error || err.error?.non_field_errors?.[0] || 'Login failed. Please try again.';
      }
    });
  }

  onRegisterSubmit(): void {
    this.authError = null;
    
    this.markFormGroupTouched(this.registerForm); 
    
    if (this.registerForm.invalid) {
        if (this.registerForm.errors?.['mismatch']) {
             this.authError = 'Passwords do not match.';
        } else {
             this.authError = 'Please check all fields (username, email, password length).';
        }
        return;
    }

    const userData = this.registerForm.getRawValue();

    this.authService.register(userData).subscribe({
      next: () => {
        this.showLogin(); 
        this.authError = 'Registration successful! You can now log in.';
      },
      error: (err) => {
        let errorMessage = 'Registration failed.';
        if (err.error) {
            if (err.error.username) { errorMessage = err.error.username[0]; }
            else if (err.error.email) { errorMessage = err.error.email[0]; }
            else if (err.error.password) { errorMessage = err.error.password[0]; }
            else if (err.error.password_confirm) { errorMessage = err.error.password_confirm[0]; }
        }
        this.authError = errorMessage;
      }
    });
  }
}




