import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { NoticeSignalrService } from '../../services/notice-signalr.service';
import { SessionTimeoutService } from '../../services/session-timeout.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './user-dashboard.html'
})
export class UserDashboardComponent implements OnInit {

  notices: any[] = [];

  userMessage = '';
  messageSent = false;

  private isSettingsTabActive = false;

  private readonly LOGOUT_API = 'http://localhost:5004/api/auth/logout';
  private readonly NOTICE_API = 'http://localhost:5004/api/notice';

  constructor(
    private signalRService: NoticeSignalrService,
    private http: HttpClient,
    private sessionTimeout: SessionTimeoutService,
    private router: Router
  ) {}

  // 🔐 Build secure headers
  private buildHeaders(): HttpHeaders {

    const token = sessionStorage.getItem('token');
    const sessionId = sessionStorage.getItem('sessionId');
    const deviceId = sessionStorage.getItem('deviceId');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'X-Session-Id': sessionId || '',
      'X-Device-Id': deviceId || ''
    });
  }

  ngOnInit() {

    // ❌ NO deviceId generation here (handled in main.ts)

    this.sessionTimeout.enforceSingleTabAfterLogin();
    this.sessionTimeout.clearTimer();

    // ✅ FETCH NOTICE
    this.http.get<any[]>(
      this.NOTICE_API,
      { headers: this.buildHeaders() }
    ).subscribe({
      next: data => this.notices = data,
      error: err => console.error('Notice fetch failed:', err)
    });

    this.signalRService.startConnection();

    this.signalRService.noticeReceived$.subscribe((notice: any) => {

      const exists = this.notices.some(
        n => n.message === notice.message &&
             n.createdAt === notice.createdAt
      );

      if (!exists) {
        this.notices.unshift(notice);
      }
    });
  }

  onTabChange(index: number) {

    this.isSettingsTabActive = index === 2;

    if (this.isSettingsTabActive) {
      this.sessionTimeout.startWatching();
    } else {
      this.sessionTimeout.clearTimer();
    }
  }

  @HostListener('document:click')
  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  resetTimer() {

    if (this.isSettingsTabActive) {
      this.sessionTimeout.resetTimer();
    }
  }

  isEncrypted(text: string): boolean {
    return !!text && text.length > 60 && !text.includes(' ');
  }

  // 🔐 JWT-based role check
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

  isUser(): boolean {
    return this.getRoleFromToken() === 'User';
  }

  // ✅ SEND MESSAGE
  sendMessageToAdmin() {

    this.http.post(
      this.NOTICE_API,
      {
        message: this.userMessage,
        receiverRole: 'Admin'
      },
      { headers: this.buildHeaders() }
    ).subscribe({

      next: () => {

        this.userMessage = '';
        this.messageSent = true;

        setTimeout(() => this.messageSent = false, 2500);
      }
    });
  }

  logout() {

    this.sessionTimeout.clearTimer();

    this.http.post(
      this.LOGOUT_API,
      {},
      { headers: this.buildHeaders() }
    ).subscribe({

      next: () => this.finishLogout(),
      error: () => this.finishLogout()
    });
  }

  private finishLogout() {

    const deviceId = sessionStorage.getItem('deviceId');

    localStorage.clear();
    sessionStorage.clear();

    if (deviceId) {
      sessionStorage.setItem('deviceId', deviceId);
    }

    this.router.navigate(['/login']);
  }
}