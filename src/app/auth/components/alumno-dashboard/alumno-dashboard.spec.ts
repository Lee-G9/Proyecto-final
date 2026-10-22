import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AlumnoDashboard } from './alumno-dashboard';

describe('AlumnoDashboard', () => {
  let fixture: ComponentFixture<AlumnoDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlumnoDashboard],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(AlumnoDashboard);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra solo Inicio, porque el backend aún no ofrece funciones de alumno', () => {
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.nav-item').length).toBe(1);
  });
});
