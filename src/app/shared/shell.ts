import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/services/auth';

export interface NavItem {
  label: string;
  path: string;
  section?: string;
  exact?: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  titulo = input.required<string>();
  badge = input.required<string>();
  rolLabel = input.required<string>();
  items = input.required<NavItem[]>();

  private auth = inject(AuthService);
  private router = inject(Router);

  menuAbierto = signal(false);
  nombre = computed(() => {
    this.auth.currentUserSignal();
    return this.auth.nombreMostrar() || this.rolLabel();
  });
  iniciales = computed(() => {
    const partes = this.nombre().trim().split(/\s+/);
    return (partes.length >= 2 ? partes[0][0] + partes[1][0] : this.nombre().substring(0, 2)).toUpperCase();
  });

  mostrarSeccion(i: number): boolean {
    const it = this.items();
    return !!it[i].section && (i === 0 || it[i - 1].section !== it[i].section);
  }

  salir(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
