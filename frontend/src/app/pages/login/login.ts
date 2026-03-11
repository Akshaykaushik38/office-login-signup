import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { SessionTimeoutService } from '../../services/session-timeout.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule
  ]
})
export class LoginComponent implements OnInit {

  email = '';
  password = '';
  errorMessage = '';
  alreadyLoggedIn = false;

  private readonly API_URL = 'http://localhost:5004/api/auth/login';

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private sessionTimeout: SessionTimeoutService
  ) {}

  ngOnInit(): void {

    // ✅ Ensure deviceId exists
    let deviceId = sessionStorage.getItem('deviceId');

    if (!deviceId) {
      deviceId = crypto.randomUUID();
      sessionStorage.setItem('deviceId', deviceId);
    }
  }

  private decodeToken(token: string): any {

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      return {
        role: payload[
          'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
        ]
      };

    } catch {
      return null;
    }
  }

  onLogin(form: any, forceLogin = false) {

    this.errorMessage = '';
    this.alreadyLoggedIn = false;

    if (form.invalid) {
      this.errorMessage = 'Email and password required';
      return;
    }

    const deviceId = sessionStorage.getItem('deviceId');

    if (!deviceId) {
      this.errorMessage = 'Device ID missing';
      return;
    }

    const payload = {
      email: this.email.trim(),
      password: this.password,
      forceLogin,
      deviceId
    };

    this.http.post<any>(
      this.API_URL,
      payload,
      {
        withCredentials: true,
        headers: {
          'X-Device-Id': deviceId
        }
      }
    ).subscribe({

      next: (res) => {

        // ✅ Store ONLY token
        sessionStorage.setItem('token', res.token);

        const decoded = this.decodeToken(res.token);

        if (!decoded) {
          this.errorMessage = 'Invalid token';
          return;
        }

        this.sessionTimeout.enforceSingleTabAfterLogin();
        this.sessionTimeout.startWatching();
        this.sessionTimeout.resetTimer();

        this.snackBar.open('Login successful', '', {
          duration: 2000
        });

        this.router.navigate(
          decoded.role === 'Admin'
            ? ['/admin-dashboard']
            : ['/user-dashboard']
        ).then(() => {

          if (decoded.role === 'User') {

            setTimeout(() => {
              this.sessionTimeout.startRefreshTimer();
            }, 1500);
          }

        });
      },

      error: (err) => {

        this.alreadyLoggedIn = false;

        if (err.error === 'ALREADY_LOGGED_IN') {
          this.alreadyLoggedIn = true;
          this.errorMessage = '';
          return;
        }

        if (typeof err.error === 'string' && err.error.trim().length > 0) {
          this.errorMessage = err.error;
        }
        else if (err.status === 401) {
          this.errorMessage = 'Invalid email or password';
        }
        else {
          this.errorMessage = 'Login failed';
        }
      }
    });
  }

  forceLogin(form: any) {
    this.onLogin(form, true);
  }
}