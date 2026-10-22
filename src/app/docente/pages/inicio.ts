import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { AuthService } from '../../auth/services/auth';
import { DocentesService } from '../../auth/services/docentes.service';
import { Oferta, TareaDocente } from '../../core/models';
import { errMsg } from '../../core/util';

@Component({
  selector: 'app-docente-inicio',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page-head">
      <div><h1>Hola, {{ nombre() }}</h1><p>Resumen de tus cursos, alumnos y entregas pendientes de calificar.</p></div>
    </div>

    @if (error()) { <div class="alert alert-err">{{ error() }}</div> }

    @if (cargando()) { <div class="loading">Cargando…</div> }
    @else {
      <section class="metrics">
        <a class="metric link" routerLink="../cursos"><strong>{{ cursos().length }}</strong><span>Cursos asignados</span></a>
        <div class="metric"><strong>{{ totalAlumnos() }}</strong><span>Alumnos matriculados</span></div>
        <div class="metric"><strong>{{ totalSesiones() }}</strong><span>Sesiones programadas</span></div>
        <div class="metric"><strong>{{ porRevisar().length }}</strong><span>Tareas con entregas por calificar</span></div>
      </section>

      <h2 class="section-title">Entregas por calificar</h2>
      @if (porRevisar().length === 0) { <div class="empty">No tienes entregas pendientes de calificación.</div> }
      @else {
        <div class="tabla-wrap">
          <table class="tabla">
            <thead><tr><th>Tarea</th><th>Curso</th><th>Fecha límite</th><th class="num">Por calificar</th><th></th></tr></thead>
            <tbody>
              @for (t of porRevisar(); track t.id) {
                <tr>
                  <td class="strong">{{ t.titulo }}</td><td>{{ t.cursoNombre }}</td><td>{{ t.fechaLimite | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="num">{{ t.totalEntregas - t.totalCalificadas }}</td>
                  <td class="acciones"><a class="btn btn-ghost btn-sm" [routerLink]="['../cursos', t.ofertaId, 'tareas', t.id]">Revisar</a></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <h2 class="section-title">Mis cursos</h2>
      @if (cursos().length === 0) { <div class="empty">Todavía no tienes cursos asignados. El administrador debe asignártelos.</div> }
      @else {
        <div class="grid-cards">
          @for (c of cursos(); track c.id) {
            <div class="card">
              <div class="card-top"><h3>{{ c.cursoNombre }}</h3><span class="badge b-info">{{ c.periodoNombre }}</span></div>
              <p class="card-meta">{{ c.cursoCodigo }} · {{ c.totalAlumnos }} alumnos · {{ c.totalSesiones }} sesiones</p>
              <div class="card-actions"><a class="btn btn-dark btn-sm" [routerLink]="['../cursos', c.id]">Abrir curso</a></div>
            </div>
          }
        </div>
      }
    }
  `,
})
export class DocenteInicio implements OnInit {
  private api = inject(DocentesService);
  private auth = inject(AuthService);
  cursos = signal<Oferta[]>([]);
  tareas = signal<TareaDocente[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  nombre = computed(() => this.auth.nombreMostrar() || 'docente');
  totalAlumnos = computed(() => this.cursos().reduce((a, c) => a + c.totalAlumnos, 0));
  totalSesiones = computed(() => this.cursos().reduce((a, c) => a + c.totalSesiones, 0));
  porRevisar = computed(() => this.tareas().filter((t) => t.totalEntregas > t.totalCalificadas));

  ngOnInit() {
    this.api.getCursosDocente().pipe(
      switchMap((cursos) => {
        this.cursos.set(cursos);
        return cursos.length ? forkJoin(cursos.map((c) => this.api.tareas(c.id))) : of([] as TareaDocente[][]);
      })
    ).subscribe({
      next: (grupos) => { this.tareas.set(grupos.flat()); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.error.set(errMsg(e, 'No se pudo cargar tu información.')); },
    });
  }
}
