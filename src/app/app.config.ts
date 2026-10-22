import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor, unauthorizedInterceptor } from './core/auth.interceptor';
import { mockInterceptor } from './core/mock.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // El mockInterceptor debe ir último: responde sin llegar al backend cuando environment.useMock = true.
    provideHttpClient(withInterceptors([authInterceptor, unauthorizedInterceptor, mockInterceptor])),
  ],
};
