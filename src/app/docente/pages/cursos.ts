import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocentesService } from '../../auth/services/docentes.service';
import { Oferta } from '../../core/models';
import { errMsg } from '../../core/util';

@Component({
  selector: 'app-docente-cursos',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div><h1>Mis cursos</h1><p>Cursos que el administrador te asignó. Ábrelos para ver alumnos, calificar, tomar asistencia y gestionar tareas.</p></div>
    </div>

    @if (error()) { <div class="alert alert-err">{{ error() }}</div> }
    @if (cargando()) { <div class="loading">Cargando tus cursos…</div> }
    @else if (cursos().length === 0) { <div class="empty">No tienes cursos asignados actualmente.</div> }
    @else {
      <div class="grid-cards">
        @for (c of cursos(); track c.id) {
          <div class="card">
            <div class="card-top"><h3>{{ c.cursoNombre }}</h3><span class="badge b-info">{{ c.periodoNombre }}</span></div>
            <p class="card-meta">{{ c.cursoCodigo }}</p>
            <p class="card-meta">{{ c.totalAlumnos }} alumnos matriculados</p>
            <p class="card-meta">{{ c.totalSesiones }} sesiones · {{ c.totalTareas }} tareas</p>
            <div class="card-actions"><a class="btn btn-dark btn-sm" [routerLink]="[c.id]">Abrir curso</a></div>
          </div>
        }
      </div>
    }
  `,
})
export class DocenteCursos implements OnInit {
  private api = inject(DocentesService);
  cursos = signal<Oferta[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.api.getCursosDocente().subscribe({
      next: (c) => { this.cursos.set(c); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.error.set(errMsg(e, 'No se pudieron cargar tus cursos.')); },
    });
  }
}
