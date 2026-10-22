import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../auth/services/auth';
import { AlumnosService } from '../../auth/services/alumnos.service';
import { Matricula, TareaAlumno } from '../../core/models';
import { errMsg } from '../../core/util';

@Component({
  selector: 'app-alumno-inicio',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page-head">
      <div><h1>Hola, {{ nombre() }}</h1><p>Tus cursos, tareas pendientes y calificaciones en un solo lugar.</p></div>
    </div>

    @if (error()) { <div class="alert alert-err">{{ error() }}</div> }
    @if (cargando()) { <div class="loading">Cargando…</div> }
    @else {
      <section class="metrics">
        <a class="metric link" routerLink="../cursos"><strong>{{ cursos().length }}</strong><span>Cursos matriculados</span></a>
        <a class="metric link" routerLink="../tareas"><strong>{{ pendientes().length }}</strong><span>Tareas pendientes</span></a>
        <a class="metric link" routerLink="../calificaciones"><strong>{{ promedio() ?? '—' }}</strong><span>Promedio de notas finales</span></a>
      </section>

      @if (vencidas() > 0) {
        <div class="alert alert-err">Tienes {{ vencidas() }} tarea(s) vencida(s) sin entregar. <a routerLink="../tareas">Ver tareas</a></div>
      }

      <h2 class="section-title">Próximas entregas</h2>
      @if (pendientes().length === 0) { <div class="empty">No tienes tareas pendientes. ¡Estás al día!</div> }
      @else {
        <div class="tabla-wrap">
          <table class="tabla">
            <thead><tr><th>Tarea</th><th>Curso</th><th>Fecha límite</th><th></th></tr></thead>
            <tbody>
              @for (t of pendientes().slice(0, 5); track t.id) {
                <tr>
                  <td class="strong">{{ t.titulo }}</td><td>{{ t.cursoNombre }}</td><td>{{ t.fechaLimite | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="acciones"><a class="btn btn-primary btn-sm" routerLink="../tareas">Entregar</a></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export class AlumnoInicio implements OnInit {
  private api = inject(AlumnosService);
  private auth = inject(AuthService);
  cursos = signal<Matricula[]>([]);
  tareas = signal<TareaAlumno[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  nombre = computed(() => this.auth.nombreMostrar() || 'estudiante');
  pendientes = computed(() => this.tareas().filter((t) => t.estado === 'PENDIENTE'));
  vencidas = computed(() => this.tareas().filter((t) => t.estado === 'VENCIDA').length);
  promedio = computed(() => {
    const n = this.cursos().map((c) => c.notaFinal).filter((x): x is number => x != null);
    return n.length ? Math.round((n.reduce((a, b) => a + b, 0) / n.length) * 100) / 100 : null;
  });

  ngOnInit() {
    forkJoin({ c: this.api.getCursosAlumno(), t: this.api.tareas() }).subscribe({
      next: (r) => { this.cursos.set(r.c); this.tareas.set(r.t); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.error.set(errMsg(e, 'No se pudo cargar tu información.')); },
    });
  }
}
