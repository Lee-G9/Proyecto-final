import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlumnosService } from '../../auth/services/alumnos.service';
import { EstadoTarea, TareaAlumno } from '../../core/models';
import { claseEstado, etiquetaEstado, errMsg, formatoBytes, notaClase } from '../../core/util';
import { Flash } from '../../shared/flash';

type Filtro = 'PENDIENTE' | 'ENTREGADA' | 'VENCIDA' | 'TODAS';
const MAX_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'app-alumno-tareas',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-head">
      <div><h1>Tareas</h1><p>Sube tus entregas antes de la fecha límite. Puedes reemplazar tu archivo hasta que el docente califique.</p></div>
    </div>

    @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

    <div class="tabs" role="tablist">
      @for (f of filtros; track f.v) {
        <button type="button" role="tab" class="tab" [class.activa]="filtro() === f.v" (click)="filtro.set(f.v)">{{ f.l }} ({{ conteo()[f.v] }})</button>
      }
    </div>

    @if (cargando()) { <div class="loading">Cargando tareas…</div> }
    @else if (visibles().length === 0) { <div class="empty">No hay tareas en esta categoría.</div> }
    @else {
      <div style="display: grid; gap: 16px">
        @for (t of visibles(); track t.id) {
          <article class="card">
            <div class="card-top">
              <div><h3>{{ t.titulo }}</h3><p class="card-meta">{{ t.cursoCodigo }} · {{ t.cursoNombre }}</p></div>
              <span [class]="'badge ' + claseEstado(t.estado)">{{ etiquetaEstado(t.estado) }}</span>
            </div>
            <p class="card-meta">Fecha límite: <strong>{{ t.fechaLimite | date: 'dd/MM/yyyy HH:mm' }}</strong> · Puntaje máximo: {{ t.puntajeMax }}</p>
            @if (t.descripcion) { <p style="margin-top: 10px">{{ t.descripcion }}</p> }

            @if (t.entrega; as e) {
              <div style="margin-top: 14px; padding: 12px 14px; background: #f8fafc; border-radius: 10px">
                <div class="small"><strong>Tu entrega:</strong> {{ e.archivoNombre }} <span class="muted">({{ bytes(e.archivoTamano) }})</span> · {{ e.fechaEntrega | date: 'dd/MM/yyyy HH:mm' }}</div>
                @if (e.comentario) { <div class="small muted" style="margin-top: 2px">Tu comentario: “{{ e.comentario }}”</div> }
                @if (e.nota != null) {
                  <div style="margin-top: 8px">Nota: <span [class]="nc(e.nota / t.puntajeMax * 20)">{{ e.nota }} / {{ t.puntajeMax }}</span></div>
                  @if (e.retroalimentacion) { <div class="small" style="margin-top: 2px">Retroalimentación del docente: {{ e.retroalimentacion }}</div> }
                }
              </div>
            }

            @if (t.estado === 'PENDIENTE' || t.estado === 'ENTREGADA') {
              <div class="form-grid" style="margin-top: 16px">
                <div class="field"><label [attr.for]="'f' + t.id">{{ t.entrega ? 'Reemplazar archivo' : 'Archivo a entregar' }}</label>
                  <input class="input" #fi type="file" [id]="'f' + t.id" (change)="elegir(t.id, fi)" />
                  <span class="hint">Máximo 10 MB.</span></div>
                <div class="field"><label [attr.for]="'c' + t.id">Comentario (opcional)</label>
                  <input class="input" [id]="'c' + t.id" [(ngModel)]="comentarios[t.id]" autocomplete="off" /></div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-primary" [disabled]="!archivos()[t.id] || subiendo() === t.id" (click)="subir(t, fi)">
                  {{ subiendo() === t.id ? 'Subiendo…' : (t.entrega ? 'Reemplazar entrega' : 'Subir tarea') }}</button>
              </div>
            } @else if (t.estado === 'VENCIDA') {
              <p class="small" style="margin-top: 12px; color: #991b1b">La fecha límite venció y no se registró una entrega.</p>
            }
          </article>
        }
      </div>
    }
  `,
})
export class AlumnoTareas implements OnInit {
  private api = inject(AlumnosService);
  tareas = signal<TareaAlumno[]>([]);
  cargando = signal(true);
  filtro = signal<Filtro>('PENDIENTE');
  archivos = signal<Record<number, File>>({});
  comentarios: Record<number, string> = {};
  subiendo = signal<number | null>(null);
  flash = new Flash();
  claseEstado = claseEstado;
  etiquetaEstado = etiquetaEstado;
  bytes = formatoBytes;
  nc = notaClase;

  filtros: { v: Filtro; l: string }[] = [
    { v: 'PENDIENTE', l: 'Pendientes' }, { v: 'ENTREGADA', l: 'Entregadas' }, { v: 'VENCIDA', l: 'Vencidas' }, { v: 'TODAS', l: 'Todas' },
  ];

  private coincide(estado: EstadoTarea, f: Filtro) {
    return f === 'TODAS' || (f === 'ENTREGADA' ? estado === 'ENTREGADA' || estado === 'CALIFICADA' : estado === f);
  }
  conteo = computed(() => {
    const t = this.tareas();
    const c = (f: Filtro) => t.filter((x) => this.coincide(x.estado, f)).length;
    return { PENDIENTE: c('PENDIENTE'), ENTREGADA: c('ENTREGADA'), VENCIDA: c('VENCIDA'), TODAS: t.length } as Record<Filtro, number>;
  });
  visibles = computed(() => this.tareas().filter((t) => this.coincide(t.estado, this.filtro())));

  ngOnInit() {
    this.api.tareas().subscribe({
      next: (t) => { this.tareas.set(t); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudieron cargar las tareas.')); },
    });
  }

  elegir(tareaId: number, input: HTMLInputElement) {
    const f = input.files?.[0];
    const resto = { ...this.archivos() };
    if (f && f.size > MAX_BYTES) {
      this.flash.err(`"${f.name}" supera el máximo de 10 MB.`);
      input.value = '';
      delete resto[tareaId];
    } else if (f) resto[tareaId] = f;
    else delete resto[tareaId];
    this.archivos.set(resto);
  }

  subir(t: TareaAlumno, input: HTMLInputElement) {
    const archivo = this.archivos()[t.id];
    if (!archivo) return;
    this.subiendo.set(t.id);
    this.api.subirTarea(t.id, archivo, this.comentarios[t.id] ?? '').subscribe({
      next: (nueva) => {
        this.subiendo.set(null);
        this.tareas.update((l) => l.map((x) => (x.id === nueva.id ? nueva : x)));
        const resto = { ...this.archivos() };
        delete resto[t.id];
        this.archivos.set(resto);
        delete this.comentarios[t.id];
        input.value = '';
        this.flash.ok(`Entrega de "${t.titulo}" registrada correctamente.`);
      },
      error: (e) => { this.subiendo.set(null); this.flash.err(errMsg(e, 'No se pudo subir la tarea.')); },
    });
  }
}
