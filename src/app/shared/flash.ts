import { signal } from '@angular/core';

export interface FlashMsg {
  tipo: 'ok' | 'err';
  texto: string;
}

/** Mensaje temporal de éxito / error para mostrar en una página. */
export class Flash {
  readonly m = signal<FlashMsg | null>(null);
  private t: ReturnType<typeof setTimeout> | null = null;

  ok(texto: string) { this.set({ tipo: 'ok', texto }); }
  err(texto: string) { this.set({ tipo: 'err', texto }); }
  clear() { this.m.set(null); }

  private set(msg: FlashMsg) {
    this.m.set(msg);
    if (this.t) clearTimeout(this.t);
    this.t = setTimeout(() => this.m.set(null), 6000);
  }
}
