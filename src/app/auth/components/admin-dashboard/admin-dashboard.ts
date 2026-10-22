import { Component } from '@angular/core';
import { NavItem, Shell } from '../../../shared/shell';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [Shell],
  template: `<app-shell titulo="Panel Admin" badge="Administrativo" rolLabel="Administrador" [items]="items" />`,
})
export class AdminDashboard {
  items: NavItem[] = [
    { label: 'Inicio General', path: 'inicio', section: 'Control global', exact: true },
    { label: 'Docentes', path: 'docentes', section: 'Usuarios' },
    { label: 'Alumnos', path: 'alumnos', section: 'Usuarios' },
    { label: 'Periodos', path: 'periodos', section: 'Estructura académica' },
    { label: 'Cursos', path: 'cursos', section: 'Estructura académica' },
    { label: 'Cursos por periodo', path: 'oferta', section: 'Asignaciones' },
    { label: 'Sesiones', path: 'sesiones', section: 'Asignaciones' },
    { label: 'Matrículas', path: 'matriculas', section: 'Asignaciones' },
  ];
}
