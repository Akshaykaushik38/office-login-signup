import { Component, OnInit, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AdminNoticeComponent } from '../admin-notice/admin-notice';
import { SessionTimeoutService } from '../../services/session-timeout.service';
import { NoticeSignalrService } from '../../services/notice-signalr.service';

import { UserStatusChartComponent } from './charts/user-status-chart.component';
import { UserGrowthChartComponent } from './charts/user-growth-chart.component';
import { LoginActivityHeatmapComponent } from './charts/login-activity-heatmap.component';
import { UserLocationComponent } from './charts/user-location.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    AdminNoticeComponent,
    UserStatusChartComponent,
    MatSnackBarModule,
    UserGrowthChartComponent,
    LoginActivityHeatmapComponent,
    UserLocationComponent,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './admin-dashboard.html'
})
export class AdminDashboardComponent implements OnInit {

  pendingUsers: any[] = [];
  notices: any[] = [];

  private API = 'http://localhost:5004/api/admin';
  private NOTICE_API = 'http://localhost:5004/api/notice';
  private LOGOUT_API = 'http://localhost:5004/api/auth/logout';

  private isAnalyticsTabActive = false;

  @ViewChild(UserStatusChartComponent)
  statusChart!: UserStatusChartComponent;

  @ViewChild(UserGrowthChartComponent)
  growthChart!: UserGrowthChartComponent;

  @ViewChild(LoginActivityHeatmapComponent)
  loginChart!: LoginActivityHeatmapComponent;

  constructor(
    private http: HttpClient,
    private router: Router,
    private sessionTimeout: SessionTimeoutService,
    private snackBar: MatSnackBar,
    private signalRService: NoticeSignalrService
  ) {}

  ngOnInit() {

    // ❌ NO deviceId generation here (handled in main.ts)

    this.sessionTimeout.enforceSingleTabAfterLogin();
    this.sessionTimeout.clearTimer();

    this.loadPendingUsers();

    this.http.get<any[]>(this.NOTICE_API)
      .subscribe({
        next: data => this.notices = data,
        error: err => console.error('Admin notice fetch failed', err)
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

  private loadPendingUsers() {
    this.http.get<any[]>(`${this.API}/pending`)
      .subscribe(res => {
        this.pendingUsers = res.map(u => ({
          ...u,
          selectedRole: 'User'
        }));
      });
  }

  onTabChange(index: number) {
    this.isAnalyticsTabActive = index === 0;

    if (this.isAnalyticsTabActive) {
      this.sessionTimeout.startWatching();

      setTimeout(() => {
        this.statusChart?.refresh();
        this.growthChart?.refresh();
        this.loginChart?.refresh();
      });
    } else {
      this.sessionTimeout.clearTimer();
    }
  }

  @HostListener('document:click')
  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  resetTimer() {
    if (this.isAnalyticsTabActive) {
      this.sessionTimeout.resetTimer();
    }
  }

  approveUser(user: any) {
    this.http.post(
      `${this.API}/approve/${user.email}`,
      { role: user.selectedRole }
    ).subscribe(() => {
      this.loadPendingUsers();

      this.snackBar.open('User approved successfully', '', {
        duration: 2500,
        verticalPosition: 'top',
        horizontalPosition: 'center'
      });
    });
  }

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

  isAdmin(): boolean {
    return this.getRoleFromToken() === 'Admin';
  }

  logout() {

    this.sessionTimeout.clearTimer();

    this.http.post(this.LOGOUT_API, {}).subscribe({
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