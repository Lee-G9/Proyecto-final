import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, normalizarRol, rutaPorRol } from '../../services/auth';
import { LoginRequest } from '../../models/login-request';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  credentials: LoginRequest = {
    username: '',
    password: ''
  };

  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Si ya hay una sesión válida, ir directo al panel correspondiente.
    if (this.authService.isLoggedIn()) {
      const destino = rutaPorRol(this.authService.getRol());
      if (destino !== '/login') this.router.navigate([destino]);
    }
  }

  onSubmit(): void {
    if (!this.credentials.username || !this.credentials.password) {
      this.errorMessage.set('Por favor, ingresa tu usuario y contraseña.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (!normalizarRol(response.rol)) {
          this.authService.logout();
          this.errorMessage.set('Tu usuario no tiene un rol válido. Contacta al administrador.');
          return;
        }
        this.router.navigate([rutaPorRol(response.rol)]);
      },
      error: (err) => {
        this.loading.set(false);
        // servicio-usuarios responde 403 (no 401) cuando las credenciales son incorrectas.
        if (err.status === 401 || err.status === 403) {
          this.errorMessage.set('Credenciales incorrectas. Verifica tu usuario o clave.');
        } else if (err.status === 0) {
          this.errorMessage.set('No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.');
        } else {
          this.errorMessage.set('Ocurrió un error al iniciar sesión. Inténtalo nuevamente.');
        }
      }
    });
  }
}
