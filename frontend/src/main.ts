import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { App } from './app/app';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/auth.interceptor';


// 🔥 STORAGE FORENSICS — DO NOT REMOVE
(function storageForensics() {
  const originalClear = sessionStorage.clear.bind(sessionStorage);
  const originalRemove = sessionStorage.removeItem.bind(sessionStorage);

  sessionStorage.clear = function () {
    console.error('🚨 sessionStorage.clear() CALLED', new Error().stack);
    return originalClear();
  };

  sessionStorage.removeItem = function (key: string) {
    if (key === 'deviceId') {
      console.error('🚨 deviceId REMOVED', new Error().stack);
    }
    return originalRemove(key);
  };
})();

// 🔐 DEVICE ID BOOTSTRAP (CRITICAL FIX)
(function ensureDeviceId() {
  let deviceId = sessionStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    sessionStorage.setItem('deviceId', deviceId);
  }
})();

bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
}).catch(err => console.error(err));