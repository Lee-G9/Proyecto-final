import { Routes } from '@angular/router';
import { LoginComponent } from './auth/components/login/login';
import { AdminDashboard } from './auth/components/admin-dashboard/admin-dashboard';
import { DocenteDashboard } from './auth/components/docente-dashboard/docente-dashboard';
import { AlumnoDashboard } from './auth/components/alumno-dashboard/alumno-dashboard';
import { authGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },

  {
    path: 'admin-dashboard',
    component: AdminDashboard,
    canActivate: [authGuard, roleGuard('ADMIN')],
    canActivateChild: [authGuard, roleGuard('ADMIN')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', loadComponent: () => import('./admin/pages/inicio').then((m) => m.AdminInicio) },
      { path: 'docentes', data: { rol: 'DOCENTE' }, loadComponent: () => import('./admin/pages/usuarios').then((m) => m.AdminUsuarios) },
      { path: 'alumnos', data: { rol: 'ALUMNO' }, loadComponent: () => import('./admin/pages/usuarios').then((m) => m.AdminUsuarios) },
      { path: 'administradores', data: { rol: 'ADMIN' }, loadComponent: () => import('./admin/pages/usuarios').then((m) => m.AdminUsuarios) },
      { path: 'periodos', loadComponent: () => import('./admin/pages/periodos').then((m) => m.AdminPeriodos) },
      { path: 'cursos', loadComponent: () => import('./admin/pages/cursos').then((m) => m.AdminCursos) },
      { path: 'oferta', loadComponent: () => import('./admin/pages/oferta').then((m) => m.AdminOferta) },
      { path: 'sesiones', loadComponent: () => import('./admin/pages/sesiones').then((m) => m.AdminSesiones) },
      { path: 'tareas', loadComponent: () => import('./admin/pages/tareas').then((m) => m.AdminTareas) },
    ],
  },

  {
    path: 'docente-dashboard',
    component: DocenteDashboard,
    canActivate: [authGuard, roleGuard('DOCENTE')],
    canActivateChild: [authGuard, roleGuard('DOCENTE')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', loadComponent: () => import('./docente/pages/inicio').then((m) => m.DocenteInicio) },
      { path: 'cursos', loadComponent: () => import('./docente/pages/cursos').then((m) => m.DocenteCursos) },
      { path: 'cursos/:id', loadComponent: () => import('./docente/pages/curso-detalle').then((m) => m.DocenteCursoDetalle) },
    ],
  },

  {
    path: 'alumno-dashboard',
    component: AlumnoDashboard,
    canActivate: [authGuard, roleGuard('ALUMNO')],
    canActivateChild: [authGuard, roleGuard('ALUMNO')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', loadComponent: () => import('./alumno/pages/inicio').then((m) => m.AlumnoInicio) },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
