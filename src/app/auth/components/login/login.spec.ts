import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { throwError } from 'rxjs';
import { AuthService } from '../../services/auth';
import { LoginComponent } from './login';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('pide usuario y contraseña si están vacíos', () => {
    component.onSubmit();
    expect(component.errorMessage()).toContain('usuario');
  });

  it('muestra credenciales incorrectas cuando el backend responde 403', () => {
    const auth = TestBed.inject(AuthService);
    spyOn(auth, 'login').and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.credentials = { username: 'admin', password: 'mala' };
    component.onSubmit();
    expect(component.errorMessage()).toContain('Credenciales incorrectas');
  });
});
