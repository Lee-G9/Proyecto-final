import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { AdminService } from '../../auth/services/admin.service';
import { Oferta, Periodo } from '../../core/models';
import { errMsg, hoyISO } from '../../core/util';

@Component({
  selector: 'app-admin-inicio',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Panel de gestión</h1>
        <p>Administración de usuarios, periodos, cursos y matrículas de la plataforma.</p>
      </div>
    </div>

    @if (error()) { <div class="alert alert-err">{{ error() }}</div> }

    <section class="metrics">
      <a class="metric link" routerLink="../alumnos"><strong>{{ alumnos() }}</strong><span>Alumnos registrados</span></a>
      <a class="metric link" routerLink="../docentes"><strong>{{ docentes() }}</strong><span>Docentes registrados</span></a>
      <a class="metric link" routerLink="../cursos"><strong>{{ cursos() }}</strong><span>Cursos en catálogo</span></a>
      <a class="metric link" routerLink="../periodos"><strong>{{ periodos() }}</strong><span>Periodos creados</span></a>
    </section>

    @if (periodo(); as p) {
      <h2 class="section-title">Cursos del periodo {{ p.nombre }}</h2>
      @if (ofertas().length === 0) {
        <div class="empty">Este periodo aún no tiene cursos. <a routerLink="../oferta">Agregar cursos al periodo</a></div>
      } @else {
        <div class="tabla-wrap">
          <table class="tabla">
            <thead><tr><th>Código</th><th>Curso</th><th>Docente</th><th class="num">Alumnos</th><th class="num">Sesiones</th></tr></thead>
            <tbody>
              @for (o of ofertas(); track o.id) {
                <tr>
                  <td>{{ o.cursoCodigo }}</td>
                  <td class="strong">{{ o.cursoNombre }}</td>
                  <td>@if (o.docenteNombre) { {{ o.docenteNombre }} } @else { <span class="badge b-warn">Sin docente</span> }</td>
                  <td class="num">{{ o.totalAlumnos }}</td>
                  <td class="num">{{ o.totalSesiones }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    <h2 class="section-title">Orden recomendado de configuración</h2>
    <div class="card">
      <ol class="pasos">
        <li><a routerLink="../docentes">Registrar docentes</a> y <a routerLink="../alumnos">alumnos</a></li>
        <li><a routerLink="../periodos">Crear el periodo</a> (por ejemplo 2026-II)</li>
        <li><a routerLink="../cursos">Crear los cursos</a> del catálogo</li>
        <li><a routerLink="../oferta">Asignar cursos al periodo</a> y elegir el docente de cada uno</li>
        <li><a routerLink="../sesiones">Crear las sesiones</a> de cada curso</li>
        <li><a routerLink="../matriculas">Matricular alumnos</a> en cada curso del periodo</li>
      </ol>
    </div>
  `,
  styles: `.pasos { margin: 0; padding-left: 20px; line-height: 2; color: #334155; font-size: 14px; } .pasos a { color: #2563eb; font-weight: 600; text-decoration: none; } .pasos a:hover { text-decoration: underline; }`,
})
export class AdminInicio implements OnInit {
  private api = inject(AdminService);
  docentes = signal(0);
  alumnos = signal(0);
  cursos = signal(0);
  periodos = signal(0);
  periodo = signal<Periodo | null>(null);
  ofertas = signal<Oferta[]>([]);
  error = signal<string | null>(null);

  ngOnInit() {
    forkJoin({ d: this.api.docentes(), a: this.api.alumnos(), c: this.api.cursos(), p: this.api.periodos() })
      .pipe(
        switchMap((r) => {
          this.docentes.set(r.d.length);
          this.alumnos.set(r.a.length);
          this.cursos.set(r.c.length);
          this.periodos.set(r.p.length);
          const hoy = hoyISO();
          const actual = r.p.find((p) => p.fechaInicio <= hoy && hoy <= p.fechaFin) ?? r.p[0] ?? null;
          this.periodo.set(actual);
          return actual ? this.api.ofertas(actual.id) : of([] as Oferta[]);
        })
      )
      .subscribe({
        next: (o) => this.ofertas.set(o),
        error: (e) => this.error.set(errMsg(e, 'No se pudo cargar el resumen.')),
      });
  }
}
