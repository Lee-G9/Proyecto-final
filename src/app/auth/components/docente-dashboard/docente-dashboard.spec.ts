import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { DocenteDashboard } from './docente-dashboard';

describe('DocenteDashboard', () => {
  let fixture: ComponentFixture<DocenteDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocenteDashboard],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(DocenteDashboard);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra el menú del rol', () => {
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.nav-item').length).toBeGreaterThan(0);
  });
});
