import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  const token = localStorage.getItem('auth_token');
  
  console.log('Interceptor - Token encontrado:', !!token);
  
  let clonedRequest = req;
  
  if (token) {
    clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Token ${token}`
      }
    });
  }
  
  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.log('Error 401 detectado, redirigiendo al login');
        // Limpiar datos de autenticación
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        // Redirigir al login
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};