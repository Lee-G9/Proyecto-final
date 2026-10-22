import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AdminService } from '../../auth/services/admin.service';
import { Matricula, Oferta, Periodo, Usuario } from '../../core/models';
import { errMsg, nombreCompleto } from '../../core/util';
import { Flash } from '../../shared/flash';

/**
 * Asignar alumnos a un curso de un periodo. Un alumno puede estar en varios cursos,
 * pero no puede matricularse dos veces en el mismo curso dentro del mismo periodo.
 */
@Component({
  selector: 'app-admin-matriculas',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div><h1>Matrículas</h1><p>Asigna alumnos a un curso de un periodo. Un alumno puede llevar varios cursos, pero no el mismo curso dos veces en un mismo periodo.</p></div>
    </div>

    @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

    @if (cargando()) { <div class="loading">Cargando…</div> }
    @else if (periodos().length === 0) { <div class="empty">Primero crea un periodo y asigna cursos.</div> }
    @else {
      <div class="toolbar">
        <div class="field"><label for="per">Periodo</label>
          <select class="select" id="per" [ngModel]="periodoId()" (ngModelChange)="cambiarPeriodo($event)">
            @for (p of periodos(); track p.id) { <option [ngValue]="p.id">{{ p.nombre }}</option> }
          </select></div>
        <div class="field" style="min-width: 300px"><label for="cur">Curso</label>
          <select class="select" id="cur" [ngModel]="ofertaId()" (ngModelChange)="cambiarOferta($event)" [disabled]="ofertas().length === 0">
            @for (o of ofertas(); track o.id) { <option [ngValue]="o.id">{{ o.cursoCodigo }} · {{ o.cursoNombre }}</option> }
          </select></div>
      </div>

      @if (ofertas().length === 0) { <div class="empty">Este periodo no tiene cursos. Agrégalos en «Cursos por periodo».</div> }
      @else if (ofertaActual(); as o) {
        <div class="card form-card">
          <h3>Matricular alumnos en {{ o.cursoNombre }}</h3>
          <p class="muted small">Docente: {{ o.docenteNombre || 'sin asignar' }} · {{ matriculas().length }} alumno(s) matriculado(s)</p>

          @if (pendientes().length === 0) {
            <p class="muted" style="margin-top: 12px">{{ alumnos().length === 0 ? 'No hay alumnos registrados.' : 'Todos los alumnos ya están matriculados en este curso.' }}</p>
          } @else {
            @if (pendientes().length > 8) {
              <div class="field" style="margin: 12px 0 4px; max-width: 320px"><label for="q">Filtrar alumnos</label>
                <input class="input" id="q" placeholder="Nombre o usuario" [ngModel]="filtro()" (ngModelChange)="filtro.set($event)" /></div>
            }
            <div class="checklist" role="group" aria-label="Alumnos disponibles" style="margin-top: 12px">
              @for (a of visibles(); track a.id) {
                <label class="check-item">
                  <input type="checkbox" [checked]="seleccion().has(a.id)" (change)="alternar(a.id)" />
                  <span>{{ nombre(a) }}<small>{{ a.username }}</small></span>
                </label>
              }
            </div>
            <div class="form-actions" style="justify-content: space-between; align-items: center">
              <span class="muted small">{{ seleccion().size }} seleccionado(s)</span>
              <div style="display: flex; gap: 8px">
                <button type="button" class="btn btn-ghost" (click)="seleccionarTodos()">{{ todosSeleccionados() ? 'Quitar selección' : 'Seleccionar todos' }}</button>
                <button type="button" class="btn btn-primary" [disabled]="seleccion().size === 0 || guardando()" (click)="matricular()">
                  {{ guardando() ? 'Matriculando…' : 'Matricular seleccionados' }}</button>
              </div>
            </div>
          }
        </div>

        <h2 class="section-title">Alumnos matriculados</h2>
        @if (matriculas().length === 0) { <div class="empty">Aún no hay alumnos matriculados en este curso.</div> }
        @else {
          <div class="tabla-wrap">
            <table class="tabla">
              <thead><tr><th>Alumno</th><th class="num">Nota final</th><th></th></tr></thead>
              <tbody>
                @for (m of matriculas(); track m.id) {
                  <tr>
                    <td class="strong">{{ m.alumnoNombre }}</td>
                    <td class="num">{{ m.notaFinal ?? '—' }}</td>
                    <td class="acciones"><button type="button" class="btn btn-danger btn-sm" (click)="anular(m)">Anular matrícula</button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    }
  `,
})
export class AdminMatriculas implements OnInit {
  private api = inject(AdminService);
  periodos = signal<Periodo[]>([]);
  ofertas = signal<Oferta[]>([]);
  alumnos = signal<Usuario[]>([]);
  matriculas = signal<Matricula[]>([]);
  periodoId = signal<number | null>(null);
  ofertaId = signal<number | null>(null);
  seleccion = signal<Set<number>>(new Set());
  filtro = signal('');
  cargando = signal(true);
  guardando = signal(false);
  flash = new Flash();
  nombre = nombreCompleto;

  ofertaActual = computed(() => this.ofertas().find((o) => o.id === this.ofertaId()) ?? null);
  pendientes = computed(() => {
    const ya = new Set(this.matriculas().map((m) => m.alumnoId));
    return this.alumnos().filter((a) => !ya.has(a.id));
  });
  visibles = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    return q ? this.pendientes().filter((a) => `${nombreCompleto(a)} ${a.username}`.toLowerCase().includes(q)) : this.pendientes();
  });
  todosSeleccionados = computed(() => this.visibles().length > 0 && this.visibles().every((a) => this.seleccion().has(a.id)));

  ngOnInit() {
    forkJoin({ p: this.api.periodos(), a: this.api.alumnos() }).subscribe({
      next: (r) => {
        this.periodos.set(r.p);
        this.alumnos.set(r.a);
        this.cargando.set(false);
        if (r.p.length) this.cambiarPeriodo(r.p[0].id);
      },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudo cargar la información.')); },
    });
  }

  cambiarPeriodo(id: number) {
    this.periodoId.set(id);
    this.ofertaId.set(null);
    this.ofertas.set([]);
    this.matriculas.set([]);
    this.api.ofertas(id).subscribe({
      next: (o) => { this.ofertas.set(o); if (o.length) this.cambiarOferta(o[0].id); },
      error: (e) => this.flash.err(errMsg(e, 'No se pudo cargar los cursos del periodo.')),
    });
  }

  cambiarOferta(id: number) {
    this.ofertaId.set(id);
    this.seleccion.set(new Set());
    this.filtro.set('');
    this.cargarMatriculas();
  }

  cargarMatriculas() {
    const id = this.ofertaId();
    if (id == null) return;
    this.api.matriculas({ ofertaId: id }).subscribe({
      next: (m) => this.matriculas.set(m),
      error: (e) => this.flash.err(errMsg(e, 'No se pudo cargar los matriculados.')),
    });
  }

  alternar(id: number) {
    const s = new Set(this.seleccion());
    s.has(id) ? s.delete(id) : s.add(id);
    this.seleccion.set(s);
  }

  seleccionarTodos() {
    const s = new Set(this.seleccion());
    if (this.todosSeleccionados()) this.visibles().forEach((a) => s.delete(a.id));
    else this.visibles().forEach((a) => s.add(a.id));
    this.seleccion.set(s);
  }

  matricular() {
    const ofertaId = this.ofertaId();
    const ids = [...this.seleccion()];
    if (ofertaId == null || ids.length === 0) return;
    this.guardando.set(true);
    forkJoin(
      ids.map((alumnoId) =>
        this.api.matricular(alumnoId, ofertaId).pipe(
          map(() => ({ ok: true, alumnoId, msg: '' })),
          catchError((e) => of({ ok: false, alumnoId, msg: errMsg(e, 'No se pudo matricular.') }))
        )
      )
    ).subscribe((res) => {
      this.guardando.set(false);
      const ok = res.filter((r) => r.ok).length;
      const fallos = res.filter((r) => !r.ok);
      if (fallos.length === 0) this.flash.ok(`${ok} alumno(s) matriculado(s) correctamente.`);
      else this.flash.err(`${ok} matriculado(s). No se pudo matricular a ${fallos.length}: ${fallos.map((f) => f.msg).join(' ')}`);
      this.seleccion.set(new Set());
      this.cargarMatriculas();
    });
  }

  anular(m: Matricula) {
    if (!confirm(`¿Anular la matrícula de ${m.alumnoNombre} en ${m.cursoNombre}? Se perderán su asistencia, entregas y notas en este curso.`)) return;
    this.api.anularMatricula(m.id).subscribe({
      next: () => { this.flash.ok(`Matrícula de ${m.alumnoNombre} anulada.`); this.cargarMatriculas(); },
      error: (e) => this.flash.err(errMsg(e, 'No se pudo anular la matrícula.')),
    });
  }
}
