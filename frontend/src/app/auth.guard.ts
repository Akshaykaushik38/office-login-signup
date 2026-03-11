import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';

// ================= TOKEN HELPERS =================

function getRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    return payload[
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    ] || null;

  } catch {
    return null;
  }
}

function getSessionIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload['sessionId'] || null;
  } catch {
    return null;
  }
}

// ================= AUTH GUARD =================

export const authGuard: CanActivateFn = (route, state) => {

  const router = inject(Router);
  const http = inject(HttpClient);

  const token = sessionStorage.getItem('token');
  const deviceId = sessionStorage.getItem('deviceId');

  // ❌ No token / device → block
  if (!token || !deviceId) {
    router.navigate(['/login']);
    return false;
  }

  const role = getRoleFromToken(token);
  const sessionId = getSessionIdFromToken(token);

  if (!role || !sessionId) {
    router.navigate(['/login']);
    return false;
  }

  // ✅ Secure headers (sessionId from JWT)
  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`,
    'X-Device-Id': deviceId,
    'X-Session-Id': sessionId
  });

  // 🔐 Backend validation
  return http.get(
    'http://localhost:5004/api/auth/validate',
    {
      headers,
      withCredentials: true
    }
  ).pipe(

    map(() => {

      // Role protection
      if (state.url.includes('admin-dashboard') && role !== 'Admin') {
        router.navigate(['/login']);
        return false;
      }

      if (state.url.includes('user-dashboard') && role !== 'User') {
        router.navigate(['/login']);
        return false;
      }

      return true;
    }),

    catchError(() => {

      // ❌ Invalid / stolen session
      const device = sessionStorage.getItem('deviceId');

      sessionStorage.clear();

      if (device) {
        sessionStorage.setItem('deviceId', device);
      }

      router.navigate(['/login']);

      return of(false);
    })
  );
};