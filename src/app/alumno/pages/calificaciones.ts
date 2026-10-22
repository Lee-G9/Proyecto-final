import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AlumnosService } from '../../auth/services/alumnos.service';
import { Matricula, TareaAlumno } from '../../core/models';
import { claseEstado, etiquetaEstado, errMsg, notaClase } from '../../core/util';

@Component({
  selector: 'app-alumno-calificaciones',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page-head">
      <div><h1>Calificaciones</h1><p>Tu nota final y el detalle de las tareas calificadas en cada curso (escala 0–20).</p></div>
      @if (promedio() !== null) { <div class="metric" style="min-width: 190px"><strong>{{ promedio() }}</strong><span>Promedio de notas finales</span></div> }
    </div>

    @if (error()) { <div class="alert alert-err">{{ error() }}</div> }
    @if (cargando()) { <div class="loading">Cargando calificaciones…</div> }
    @else if (cursos().length === 0) { <div class="empty">Todavía no estás matriculado en ningún curso.</div> }
    @else {
      <div style="display: grid; gap: 20px">
        @for (c of cursos(); track c.id) {
          <article class="card">
            <div class="card-top">
              <div><h3>{{ c.cursoNombre }}</h3><p class="card-meta">{{ c.cursoCodigo }} · {{ c.periodoNombre }} · Docente: {{ c.docenteNombre || 'por asignar' }}</p></div>
              <div style="text-align: right">
                <div class="muted small">Nota final</div>
                <div style="font-size: 28px; font-weight: 800" [class]="nc(c.notaFinal)">{{ c.notaFinal ?? '—' }}</div>
              </div>
            </div>
            @if (c.observacion) { <p class="small" style="margin-top: 4px">Observación del docente: {{ c.observacion }}</p> }
            <p class="card-meta">Promedio de tareas calificadas: <strong>{{ c.promedioTareas ?? '—' }}</strong></p>

            @if (tareasDe(c.ofertaId).length > 0) {
              <div class="tabla-wrap" style="margin-top: 14px">
                <table class="tabla">
                  <thead><tr><th>Tarea</th><th>Estado</th><th class="num">Nota</th><th>Retroalimentación</th></tr></thead>
                  <tbody>
                    @for (t of tareasDe(c.ofertaId); track t.id) {
                      <tr>
                        <td class="strong">{{ t.titulo }}<div class="muted small">Límite {{ t.fechaLimite | date: 'dd/MM/yyyy' }}</div></td>
                        <td><span [class]="'badge ' + claseEstado(t.estado)">{{ etiquetaEstado(t.estado) }}</span></td>
                        <td class="num">{{ t.entrega?.nota != null ? t.entrega?.nota + ' / ' + t.puntajeMax : '—' }}</td>
                        <td class="muted">{{ t.entrega?.retroalimentacion || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else { <p class="muted small" style="margin-top: 10px">Este curso aún no tiene tareas.</p> }
          </article>
        }
      </div>
    }
  `,
})
export class AlumnoCalificaciones implements OnInit {
  private api = inject(AlumnosService);
  cursos = signal<Matricula[]>([]);
  tareas = signal<TareaAlumno[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  claseEstado = claseEstado;
  etiquetaEstado = etiquetaEstado;
  nc = notaClase;

  promedio = computed(() => {
    const n = this.cursos().map((c) => c.notaFinal).filter((x): x is number => x != null);
    return n.length ? Math.round((n.reduce((a, b) => a + b, 0) / n.length) * 100) / 100 : null;
  });

  ngOnInit() {
    forkJoin({ c: this.api.getCursosAlumno(), t: this.api.tareas() }).subscribe({
      next: (r) => { this.cursos.set(r.c); this.tareas.set(r.t); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.error.set(errMsg(e, 'No se pudieron cargar tus calificaciones.')); },
    });
  }

  tareasDe(ofertaId: number): TareaAlumno[] { return this.tareas().filter((t) => t.ofertaId === ofertaId); }
}
