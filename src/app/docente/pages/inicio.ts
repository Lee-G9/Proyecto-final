import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/services/auth';
import { DocentesService } from '../../auth/services/docentes.service';
import { Oferta } from '../../core/models';
import { errMsg } from '../../core/util';

@Component({
  selector: 'app-docente-inicio',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div><h1>Hola, {{ nombre() }}</h1><p>Resumen de tus cursos, sesiones y tareas.</p></div>
    </div>

    @if (error()) { <div class="alert alert-err">{{ error() }}</div> }

    @if (cargando()) { <div class="loading">Cargando…</div> }
    @else {
      <section class="metrics">
        <a class="metric link" routerLink="../cursos"><strong>{{ cursos().length }}</strong><span>Cursos asignados</span></a>
        <div class="metric"><strong>{{ totalSesiones() }}</strong><span>Sesiones programadas</span></div>
        <div class="metric"><strong>{{ totalTareas() }}</strong><span>Tareas publicadas</span></div>
      </section>

      <h2 class="section-title">Mis cursos</h2>
      @if (cursos().length === 0) { <div class="empty">Todavía no tienes cursos asignados. El administrador debe asignártelos.</div> }
      @else {
        <div class="grid-cards">
          @for (c of cursos(); track c.id) {
            <div class="card">
              <div class="card-top"><h3>{{ c.cursoNombre }}</h3><span class="badge b-info">{{ c.periodoNombre }}</span></div>
              <p class="card-meta">{{ c.cursoCodigo }} · {{ c.totalSesiones }} sesiones · {{ c.totalTareas }} tareas</p>
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
  cargando = signal(true);
  error = signal<string | null>(null);

  nombre = computed(() => this.auth.nombreMostrar() || 'docente');
  totalSesiones = computed(() => this.cursos().reduce((a, c) => a + c.totalSesiones, 0));
  totalTareas = computed(() => this.cursos().reduce((a, c) => a + c.totalTareas, 0));

  ngOnInit() {
    this.api.getCursosDocente().subscribe({
      next: (c) => { this.cursos.set(c); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.error.set(errMsg(e, 'No se pudo cargar tu información.')); },
    });
  }
}
