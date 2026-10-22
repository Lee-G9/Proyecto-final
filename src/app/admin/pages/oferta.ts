import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../auth/services/admin.service';
import { Curso, Oferta, Periodo, Usuario } from '../../core/models';
import { errMsg, nombreCompleto } from '../../core/util';
import { Flash } from '../../shared/flash';

/** Asignar cursos a un periodo y profesores a cada curso del periodo. */
@Component({
  selector: 'app-admin-oferta',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div><h1>Cursos por periodo</h1><p>Elige un periodo, agrega los cursos que se dictarán y asigna un docente a cada uno.</p></div>
    </div>

    @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

    @if (cargando()) { <div class="loading">Cargando…</div> }
    @else if (periodos().length === 0) { <div class="empty">Primero crea un periodo en la sección «Periodos».</div> }
    @else {
      <div class="toolbar">
        <div class="field"><label for="per">Periodo</label>
          <select class="select" id="per" [ngModel]="periodoId()" (ngModelChange)="cambiarPeriodo($event)">
            @for (p of periodos(); track p.id) { <option [ngValue]="p.id">{{ p.nombre }}</option> }
          </select></div>
      </div>

      <div class="card form-card">
        <h3>Agregar curso al periodo</h3>
        @if (disponibles().length === 0) {
          <p class="muted">@if (cursos().length === 0) { No hay cursos en el catálogo. Crea uno en «Cursos». } @else { Todos los cursos del catálogo ya están en este periodo. }</p>
        } @else {
          <div class="form-grid" style="margin-top: 12px">
            <div class="field"><label for="cur">Curso</label>
              <select class="select" id="cur" [(ngModel)]="nuevo.cursoId">
                <option [ngValue]="null">Selecciona un curso</option>
                @for (c of disponibles(); track c.id) { <option [ngValue]="c.id">{{ c.codigo }} · {{ c.nombre }}</option> }
              </select></div>
            <div class="field"><label for="doc">Docente (opcional)</label>
              <select class="select" id="doc" [(ngModel)]="nuevo.docenteId">
                <option [ngValue]="null">Asignar después</option>
                @for (d of docentes(); track d.id) { <option [ngValue]="d.id">{{ nombre(d) }}</option> }
              </select></div>
            <div class="field"><label>&nbsp;</label>
              <button type="button" class="btn btn-primary" [disabled]="nuevo.cursoId === null || guardando()" (click)="agregar()">Agregar al periodo</button></div>
          </div>
        }
      </div>

      @if (ofertas().length === 0) { <div class="empty">Este periodo todavía no tiene cursos.</div> }
      @else {
        <div class="tabla-wrap">
          <table class="tabla">
            <thead><tr><th>Código</th><th>Curso</th><th>Docente asignado</th><th class="num">Alumnos</th><th class="num">Sesiones</th><th></th></tr></thead>
            <tbody>
              @for (o of ofertas(); track o.id) {
                <tr>
                  <td>{{ o.cursoCodigo }}</td>
                  <td class="strong">{{ o.cursoNombre }}</td>
                  <td style="min-width: 220px">
                    <select class="select compacto" [attr.aria-label]="'Docente de ' + o.cursoNombre" [ngModel]="o.docenteId" (ngModelChange)="cambiarDocente(o, $event)">
                      <option [ngValue]="null">Sin asignar</option>
                      @for (d of docentes(); track d.id) { <option [ngValue]="d.id">{{ nombre(d) }}</option> }
                    </select>
                  </td>
                  <td class="num">{{ o.totalAlumnos }}</td>
                  <td class="num">{{ o.totalSesiones }}</td>
                  <td class="acciones">
                    <button type="button" class="btn btn-danger btn-sm" [disabled]="o.totalAlumnos > 0"
                      [title]="o.totalAlumnos > 0 ? 'Tiene alumnos matriculados' : 'Quitar del periodo'" (click)="quitar(o)">Quitar</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export class AdminOferta implements OnInit {
  private api = inject(AdminService);
  periodos = signal<Periodo[]>([]);
  cursos = signal<Curso[]>([]);
  docentes = signal<Usuario[]>([]);
  ofertas = signal<Oferta[]>([]);
  periodoId = signal<number | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  nuevo: { cursoId: number | null; docenteId: number | null } = { cursoId: null, docenteId: null };
  flash = new Flash();
  nombre = nombreCompleto;

  disponibles = computed(() => this.cursos().filter((c) => !this.ofertas().some((o) => o.cursoId === c.id)));

  ngOnInit() {
    forkJoin({ p: this.api.periodos(), c: this.api.cursos(), d: this.api.docentes() }).subscribe({
      next: (r) => {
        this.periodos.set(r.p);
        this.cursos.set(r.c);
        this.docentes.set(r.d);
        this.cargando.set(false);
        if (r.p.length) this.cambiarPeriodo(r.p[0].id);
      },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudo cargar la información.')); },
    });
  }

  cambiarPeriodo(id: number) {
    this.periodoId.set(id);
    this.nuevo = { cursoId: null, docenteId: null };
    this.cargarOfertas();
  }

  cargarOfertas() {
    const id = this.periodoId();
    if (id == null) return;
    this.api.ofertas(id).subscribe({
      next: (o) => this.ofertas.set(o),
      error: (e) => this.flash.err(errMsg(e, 'No se pudo cargar los cursos del periodo.')),
    });
  }

  agregar() {
    const periodoId = this.periodoId();
    if (periodoId == null || this.nuevo.cursoId == null) return;
    this.guardando.set(true);
    this.api.asignarCursoAPeriodo(this.nuevo.cursoId, periodoId, this.nuevo.docenteId).subscribe({
      next: (o) => {
        this.guardando.set(false);
        this.flash.ok(`${o.cursoNombre} agregado al periodo ${o.periodoNombre}.`);
        this.nuevo = { cursoId: null, docenteId: null };
        this.cargarOfertas();
      },
      error: (e) => { this.guardando.set(false); this.flash.err(errMsg(e, 'No se pudo agregar el curso.')); },
    });
  }

  cambiarDocente(o: Oferta, docenteId: number | null) {
    this.api.asignarDocente(o.id, docenteId).subscribe({
      next: (r) => {
        this.flash.ok(r.docenteNombre ? `${r.docenteNombre} asignado a ${r.cursoNombre}.` : `Se quitó el docente de ${r.cursoNombre}.`);
        this.cargarOfertas();
      },
      error: (e) => { this.flash.err(errMsg(e, 'No se pudo asignar el docente.')); this.cargarOfertas(); },
    });
  }

  quitar(o: Oferta) {
    if (!confirm(`¿Quitar "${o.cursoNombre}" del periodo ${o.periodoNombre}? Se eliminarán también sus sesiones y tareas.`)) return;
    this.api.quitarOferta(o.id).subscribe({
      next: () => { this.flash.ok(`${o.cursoNombre} fue quitado del periodo.`); this.cargarOfertas(); },
      error: (e) => this.flash.err(errMsg(e, 'No se pudo quitar el curso.')),
    });
  }
}
