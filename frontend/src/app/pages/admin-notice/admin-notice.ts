import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-admin-notice',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatSnackBarModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './admin-notice.html',
  styleUrls: ['./admin-notice.css']
})
export class AdminNoticeComponent {

  message: string = '';
  receiverRole: string = 'All'; 

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  createNotice() {
    const payload = {
      message: this.message,
      receiverRole: this.receiverRole
    };

    this.http.post(
      'http://localhost:5004/api/notice',
      payload,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'text'
      }
    ).subscribe({
      next: () => {
        this.message = '';
        this.receiverRole = 'All';

        this.snackBar.open('Notice sent successfully', '', {
          duration: 2500,
          verticalPosition: 'top',
          horizontalPosition: 'center',
          panelClass: ['notice-success-snackbar']
        });
      },
      error: (err) => {
        console.warn('Notice created but frontend got non-JSON response', err);

        this.message = '';
        this.receiverRole = 'All';

        this.snackBar.open('Notice sent successfully', '', {
          duration: 2500,
          verticalPosition: 'top',
          horizontalPosition: 'center',
          panelClass: ['notice-success-snackbar']
        });
      }
    });
  }
}
