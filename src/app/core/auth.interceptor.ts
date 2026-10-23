import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/services/auth';
import { environment } from '../../environments/environment';

const esApi = (url: string) =>
  [
    environment.usuariosUrl,
    environment.academicoUrl,
    environment.seguimientoUrl,
  ].some((base) => url.startsWith(base));

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();

  if (token && esApi(req.url) && !req.url.endsWith('/auth/login')) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};

export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !req.url.endsWith('/auth/login')
      ) {
        auth.logout();
        router.navigate(['/login']);
      }

      return throwError(() => err);
    })
  );
};
