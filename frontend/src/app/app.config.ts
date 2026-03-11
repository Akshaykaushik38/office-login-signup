import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient()
  ]
};