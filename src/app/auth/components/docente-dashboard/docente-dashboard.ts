import { Component } from '@angular/core';
import { NavItem, Shell } from '../../../shared/shell';

@Component({
  selector: 'app-docente-dashboard',
  standalone: true,
  imports: [Shell],
  template: `<app-shell titulo="Portal Docente" badge="Aula Nexa" rolLabel="Docente" [items]="items" />`,
})
export class DocenteDashboard {
  items: NavItem[] = [
    { label: 'Inicio', path: 'inicio', section: 'Academia', exact: true },
    { label: 'Mis cursos', path: 'cursos', section: 'Academia' },
  ];
}
