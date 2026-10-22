import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../auth/services/auth';

/** El backend aún no ofrece matrículas, tareas ni calificaciones para alumnos: el portal solo da la bienvenida. */
@Component({
  selector: 'app-alumno-inicio',
  standalone: true,
  template: `
    <div class="page-head">
      <div><h1>Hola, {{ nombre() }}</h1><p>Tu portal de alumno.</p></div>
    </div>
    <div class="empty">Todavía no hay funciones disponibles para alumnos. Cuando se habiliten tus cursos, tareas y calificaciones los verás aquí.</div>
  `,
})
export class AlumnoInicio {
  private auth = inject(AuthService);
  nombre = computed(() => this.auth.nombreMostrar() || 'alumno');
}
