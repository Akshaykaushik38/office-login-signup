import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule
  ],
  templateUrl: './signup.html',
  styleUrls: ['./signup.css']
})
export class SignupComponent {

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  private API_URL = 'http://localhost:5004/api/auth/signup';

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  onSignup(form: any) {
    if (form.invalid) {
      this.errorMessage = 'Please fill all fields with valid values';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    const payload = {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email: this.email.trim(),
      password: this.password,
      confirmPassword: this.confirmPassword
    };

    this.http.post(this.API_URL, payload, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.snackBar.open('Signup successful. Await admin approval.', '', {
            duration: 2500,
            verticalPosition: 'top',
            horizontalPosition: 'center',
            panelClass: ['notice-success-snackbar']
          });

          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.errorMessage = err.error || 'Signup failed';
        }
      });
  }
}
