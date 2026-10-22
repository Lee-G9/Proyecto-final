import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DocentesService } from '../../auth/services/docentes.service';
import { FilaEntrega, TareaDocente } from '../../core/models';
import { claseEstado, etiquetaEstado, errMsg, formatoBytes } from '../../core/util';
import { Flash } from '../../shared/flash';

interface FilaEdit { f: FilaEntrega; nota: number | null; retro: string; guardando: boolean; }

/** Revisión de entregas: el docente solo puede calificar y comentar, nunca modificar lo entregado. */
@Component({
  selector: 'app-docente-entregas',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <a class="back-link" [routerLink]="['/docente-dashboard/cursos', id()]">← Volver al curso</a>

    @if (cargando()) { <div class="loading">Cargando entregas…</div> }
    @else if (tarea(); as t) {
      <div class="page-head">
        <div>
          <h1>{{ t.titulo }}</h1>
          <p>{{ t.cursoNombre }} · Fecha límite {{ t.fechaLimite | date: 'dd/MM/yyyy HH:mm' }} · Puntaje máximo {{ t.puntajeMax }}</p>
          @if (t.descripcion) { <p style="margin-top: 8px">{{ t.descripcion }}</p> }
        </div>
        <div class="muted small">{{ entregadas() }} de {{ filas().length }} entregaron · {{ calificadas() }} calificadas</div>
      </div>

      @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }
      <p class="muted small" style="margin: 0 0 12px">Los archivos y comentarios de los alumnos son de solo lectura: aquí solo puedes calificar y dejar retroalimentación.</p>

      @if (filas().length === 0) { <div class="empty">No hay alumnos matriculados en este curso.</div> }
      @else {
        <div class="tabla-wrap">
          <table class="tabla">
            <thead><tr><th>Alumno</th><th>Estado</th><th>Entrega</th><th style="width: 110px">Nota (0–{{ t.puntajeMax }})</th><th>Retroalimentación</th><th></th></tr></thead>
            <tbody>
              @for (r of filas(); track r.f.matriculaId) {
                <tr>
                  <td class="strong">{{ r.f.alumnoNombre }}</td>
                  <td><span class="badge" [class]="'badge ' + claseEstado(r.f.estado)">{{ etiquetaEstado(r.f.estado) }}</span></td>
                  <td>
                    @if (r.f.entregaId) {
                      @if (r.f.archivoUrl) { <a [href]="r.f.archivoUrl" target="_blank" rel="noopener">{{ r.f.archivoNombre }}</a> } @else { {{ r.f.archivoNombre }} }
                      <span class="muted small"> ({{ bytes(r.f.archivoTamano) }})</span>
                      <div class="muted small">{{ r.f.fechaEntrega | date: 'dd/MM/yyyy HH:mm' }}</div>
                      @if (r.f.comentario) { <div class="small" style="margin-top: 2px">“{{ r.f.comentario }}”</div> }
                    } @else { <span class="muted">Sin entrega</span> }
                  </td>
                  <td><input class="input compacto" type="number" min="0" [max]="t.puntajeMax" step="0.5" [disabled]="!r.f.entregaId" [attr.aria-label]="'Nota de ' + r.f.alumnoNombre" [(ngModel)]="r.nota" /></td>
                  <td style="min-width: 220px"><input class="input compacto" [disabled]="!r.f.entregaId" [attr.aria-label]="'Retroalimentación para ' + r.f.alumnoNombre" [(ngModel)]="r.retro" placeholder="Opcional" /></td>
                  <td class="acciones"><button type="button" class="btn btn-primary btn-sm" [disabled]="!r.f.entregaId || r.guardando" (click)="calificar(r, t)">
                    {{ r.guardando ? 'Guardando…' : (r.f.estado === 'CALIFICADA' ? 'Actualizar nota' : 'Calificar') }}</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export class DocenteEntregas implements OnInit {
  id = input.required<string>();       // :id  (curso)
  tareaId = input.required<string>();  // :tareaId
  private api = inject(DocentesService);

  tarea = signal<TareaDocente | null>(null);
  filas = signal<FilaEdit[]>([]);
  cargando = signal(true);
  flash = new Flash();
  claseEstado = claseEstado;
  etiquetaEstado = etiquetaEstado;
  bytes = formatoBytes;

  entregadas = computed(() => this.filas().filter((r) => r.f.entregaId).length);
  calificadas = computed(() => this.filas().filter((r) => r.f.estado === 'CALIFICADA').length);

  ngOnInit() {
    const tid = Number(this.tareaId());
    forkJoin({ t: this.api.tarea(tid), e: this.api.entregas(tid) }).subscribe({
      next: (r) => {
        this.tarea.set(r.t);
        this.filas.set(r.e.map((f) => ({ f, nota: f.nota, retro: f.retroalimentacion ?? '', guardando: false })));
        this.cargando.set(false);
      },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudo cargar la tarea.')); },
    });
  }

  calificar(r: FilaEdit, t: TareaDocente) {
    if (!r.f.entregaId) return;
    if (r.nota == null || isNaN(Number(r.nota)) || r.nota < 0 || r.nota > t.puntajeMax) {
      this.flash.err(`La nota debe estar entre 0 y ${t.puntajeMax}.`);
      return;
    }
    r.guardando = true;
    this.api.calificarEntrega(r.f.entregaId, Number(r.nota), r.retro).subscribe({
      next: (e) => {
        r.guardando = false;
        r.f = { ...r.f, nota: e.nota, retroalimentacion: e.retroalimentacion, estado: 'CALIFICADA' };
        this.filas.update((l) => [...l]);
        this.flash.ok(`${r.f.alumnoNombre}: nota ${e.nota} guardada.`);
      },
      error: (e) => { r.guardando = false; this.flash.err(errMsg(e, 'No se pudo guardar la calificación.')); },
    });
  }
}
