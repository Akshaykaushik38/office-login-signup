import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class SessionTimeoutService {

  private inactivityTimer: any;
  private refreshTimer: any;

  private refreshInProgress = false;
  private lastRefreshTime = 0;

  private readonly INACTIVITY_TIMEOUT = 20000;

  private readonly REFRESH_CHECK_INTERVAL = 30000; // 30 sec
  private readonly MIN_REFRESH_GAP = 20000; // 20 sec

  private readonly REFRESH_API = 'http://localhost:5004/api/auth/refresh';
  private readonly LOGOUT_API = 'http://localhost:5004/api/auth/logout';

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  // ================= TOKEN HELPERS =================

  private getRoleFromToken(): string | null {

    const token = sessionStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload[
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
      ] || null;
    } catch {
      return null;
    }
  }

  private getTokenExpiry(): number | null {

    const token = sessionStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000;
    } catch {
      return null;
    }
  }

  private isTokenNearExpiry(): boolean {

    const exp = this.getTokenExpiry();
    if (!exp) return false;

    const now = Date.now();
    return exp - now < 2 * 60 * 1000;
  }

  // ================= SINGLE TAB =================
  // Now backend enforces real session security.
  // Frontend only prevents duplicate UI tabs.

  enforceSingleTabAfterLogin() {

    const role = this.getRoleFromToken();
    if (role === 'Admin') return;

    const token = sessionStorage.getItem('token');
    if (!token) return;

    const localKey = 'active_frontend_tab';

    const currentTabId = sessionStorage.getItem(localKey) || crypto.randomUUID();
    sessionStorage.setItem(localKey, currentTabId);

    const activeTab = localStorage.getItem(localKey);

    if (!activeTab) {
      localStorage.setItem(localKey, currentTabId);
      return;
    }

    if (activeTab !== currentTabId) {
      this.blockThisTabOnly();
    }
  }

  // ================= INACTIVITY =================

  startWatching() {

    this.clearTimer();

    this.ngZone.runOutsideAngular(() => {

      this.inactivityTimer = setTimeout(() => {
        this.ngZone.run(() => this.logout());
      }, this.INACTIVITY_TIMEOUT);

    });
  }

  resetTimer() {
    this.startWatching();
  }

  clearTimer() {

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  // ================= REFRESH =================

  startRefreshTimer() {

    const role = this.getRoleFromToken();
    if (role === 'Admin') return;

    this.stopRefreshTimer();

    this.ngZone.runOutsideAngular(() => {

      this.refreshTimer = setInterval(() => {

        this.ngZone.run(() => {

          if (this.isTokenNearExpiry()) {
            this.refreshToken();
          }

        });

      }, this.REFRESH_CHECK_INTERVAL);

    });
  }

  private stopRefreshTimer() {

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private refreshToken() {

    const now = Date.now();

    if (this.refreshInProgress) return;
    if (now - this.lastRefreshTime < this.MIN_REFRESH_GAP) return;

    const token = sessionStorage.getItem('token');
    if (!token) return;

    this.refreshInProgress = true;
    this.lastRefreshTime = now;

    this.http.post<any>(
      this.REFRESH_API,
      {},
      { withCredentials: true }
    ).subscribe({

      next: (res) => {

        if (res?.token) {
          sessionStorage.setItem('token', res.token);
        }

        this.refreshInProgress = false;
      },

      error: () => {
        // Do NOT logout on temporary failure
        this.refreshInProgress = false;
      }

    });
  }

  // ================= LOGOUT =================

  logout() {

    this.stopRefreshTimer();
    this.clearTimer();

    this.http.post(
      this.LOGOUT_API,
      {},
      { withCredentials: true }
    ).subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout()
    });
  }

  private blockThisTabOnly() {

    this.stopRefreshTimer();

    const deviceId = sessionStorage.getItem('deviceId');

    sessionStorage.clear();

    if (deviceId) {
      sessionStorage.setItem('deviceId', deviceId);
    }

    this.snackBar.open(
      'Another tab is already active. This tab is logged out.',
      '',
      {
        duration: 3000,
        verticalPosition: 'top',
        horizontalPosition: 'center'
      }
    );

    this.router.navigate(['/login']);
  }

  private finishLogout() {

    this.stopRefreshTimer();

    localStorage.removeItem('active_frontend_tab');

    const deviceId = sessionStorage.getItem('deviceId');

    sessionStorage.clear();

    if (deviceId) {
      sessionStorage.setItem('deviceId', deviceId);
    }

    this.snackBar.open(
      'Session expired',
      '',
      {
        duration: 3000,
        verticalPosition: 'top',
        horizontalPosition: 'center'
      }
    );

    this.router.navigate(['/login']);
  }
}