import { Component } from '@angular/core';
import { NavItem, Shell } from '../../../shared/shell';

@Component({
  selector: 'app-alumno-dashboard',
  standalone: true,
  imports: [Shell],
  template: `<app-shell titulo="Portal Alumno" badge="Aula Nexa" rolLabel="Alumno" [items]="items" />`,
})
export class AlumnoDashboard {
  items: NavItem[] = [
    { label: 'Inicio', path: 'inicio', section: 'Mi aprendizaje', exact: true },
  ];
}
