import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, normalizarRol, rutaPorRol } from '../auth/services/auth';

/** Exige sesión iniciada. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  auth.logout();
  return router.createUrlTree(['/login']);
};

/** Exige un rol concreto; si el usuario es de otro rol lo envía a su propio panel. */
export const roleGuard = (rol: 'ADMIN' | 'DOCENTE' | 'ALUMNO'): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const actual = normalizarRol(auth.getRol());
  if (actual === rol) return true;
  return router.parseUrl(rutaPorRol(actual));
};
