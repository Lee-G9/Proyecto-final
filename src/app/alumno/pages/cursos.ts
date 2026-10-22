import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AlumnosService } from '../../auth/services/alumnos.service';
import { Matricula, Sesion, TareaAlumno } from '../../core/models';
import { claseEstado, etiquetaEstado, errMsg, notaClase } from '../../core/util';

@Component({
  selector: 'app-alumno-cursos',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page-head">
      <div><h1>Mis cursos</h1><p>Cursos en los que estás matriculado. Abre uno para ver sus sesiones y tareas.</p></div>
    </div>

    @if (error()) { <div class="alert alert-err">{{ error() }}</div> }
    @if (cargando()) { <div class="loading">Cargando tus cursos…</div> }
    @else if (cursos().length === 0) { <div class="empty">Todavía no estás matriculado en ningún curso.</div> }
    @else {
      <div class="grid-cards">
        @for (c of cursos(); track c.id) {
          <div class="card" [style.grid-column]="abierto() === c.ofertaId ? '1 / -1' : null">
            <div class="card-top"><h3>{{ c.cursoNombre }}</h3><span class="badge b-info">{{ c.periodoNombre }}</span></div>
            <p class="card-meta">{{ c.cursoCodigo }} · Docente: {{ c.docenteNombre || 'por asignar' }}</p>
            <p class="card-meta">Nota final: <span [class]="nc(c.notaFinal)">{{ c.notaFinal ?? 'sin calificar' }}</span></p>
            <div class="card-actions">
              <button type="button" class="btn btn-dark btn-sm" [attr.aria-expanded]="abierto() === c.ofertaId" (click)="alternar(c)">
                {{ abierto() === c.ofertaId ? 'Ocultar detalle' : 'Ver detalle' }}</button>
            </div>

            @if (abierto() === c.ofertaId) {
              <h3 style="margin-top: 22px">Sesiones</h3>
              @if (sesiones()[c.ofertaId]; as ses) {
                @if (ses.length === 0) { <p class="muted small">Aún no hay sesiones programadas.</p> }
                @else {
                  <div class="tabla-wrap" style="margin-top: 8px">
                    <table class="tabla">
                      <thead><tr><th class="num">N.º</th><th>Título</th><th>Fecha</th></tr></thead>
                      <tbody>@for (s of ses; track s.id) { <tr><td class="num">{{ s.numero }}</td><td class="strong">{{ s.titulo }}</td><td>{{ s.fecha | date: 'dd/MM/yyyy' }}</td></tr> }</tbody>
                    </table>
                  </div>
                }
              } @else { <p class="muted small">Cargando sesiones…</p> }

              <h3 style="margin-top: 22px">Tareas</h3>
              @if (tareasDe(c.ofertaId).length === 0) { <p class="muted small">Este curso aún no tiene tareas.</p> }
              @else {
                <div class="tabla-wrap" style="margin-top: 8px">
                  <table class="tabla">
                    <thead><tr><th>Tarea</th><th>Fecha límite</th><th>Estado</th><th class="num">Nota</th></tr></thead>
                    <tbody>
                      @for (t of tareasDe(c.ofertaId); track t.id) {
                        <tr>
                          <td class="strong">{{ t.titulo }}</td><td>{{ t.fechaLimite | date: 'dd/MM/yyyy HH:mm' }}</td>
                          <td><span [class]="'badge ' + claseEstado(t.estado)">{{ etiquetaEstado(t.estado) }}</span></td>
                          <td class="num">{{ t.entrega?.nota != null ? t.entrega?.nota + ' / ' + t.puntajeMax : '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <div class="card-actions"><a class="btn btn-primary btn-sm" routerLink="../tareas">Ir a mis tareas</a></div>
              }
            }
          </div>
        }
      </div>
    }
  `,
})
export class AlumnoCursos implements OnInit {
  private api = inject(AlumnosService);
  cursos = signal<Matricula[]>([]);
  tareas = signal<TareaAlumno[]>([]);
  sesiones = signal<Record<number, Sesion[]>>({});
  abierto = signal<number | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);
  claseEstado = claseEstado;
  etiquetaEstado = etiquetaEstado;
  nc = notaClase;

  ngOnInit() {
    forkJoin({ c: this.api.getCursosAlumno(), t: this.api.tareas() }).subscribe({
      next: (r) => { this.cursos.set(r.c); this.tareas.set(r.t); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.error.set(errMsg(e, 'No se pudieron cargar tus cursos.')); },
    });
  }

  tareasDe(ofertaId: number): TareaAlumno[] { return this.tareas().filter((t) => t.ofertaId === ofertaId); }

  alternar(c: Matricula) {
    if (this.abierto() === c.ofertaId) { this.abierto.set(null); return; }
    this.abierto.set(c.ofertaId);
    if (!this.sesiones()[c.ofertaId]) {
      this.api.sesiones(c.ofertaId).subscribe({
        next: (s) => this.sesiones.update((m) => ({ ...m, [c.ofertaId]: s })),
        error: (e) => { this.error.set(errMsg(e, 'No se pudieron cargar las sesiones.')); this.sesiones.update((m) => ({ ...m, [c.ofertaId]: [] })); },
      });
    }
  }
}
