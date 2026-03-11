import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

// ================= TOKEN HELPER =================

function getSessionIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload['sessionId'] || null;
  } catch {
    return null;
  }
}

// ================= INTERCEPTOR =================

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const router = inject(Router);

  const token = sessionStorage.getItem('token');
  const deviceId = sessionStorage.getItem('deviceId');

  // ✅ Extract sessionId from JWT (NOT storage)
  const sessionId = token ? getSessionIdFromToken(token) : null;

  // 🔐 Attach headers
  if (token && sessionId && deviceId) {

    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'X-Session-Id': sessionId,
        'X-Device-Id': deviceId
      }
    });
  }

  return next(req).pipe(

    catchError((error: HttpErrorResponse) => {

      // ✅ Never logout for auth routes
      if (
        req.url.includes('/api/auth/login') ||
        req.url.includes('/api/auth/signup') ||
        req.url.includes('/api/auth/refresh') ||
        req.url.includes('/api/notice')
      ) {
        return throwError(() => error);
      }

      // 🔐 Logout on real auth failure
      if (error.status === 401) {

        const savedDeviceId = sessionStorage.getItem('deviceId');

        sessionStorage.clear();

        if (savedDeviceId) {
          sessionStorage.setItem('deviceId', savedDeviceId);
        }

        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};