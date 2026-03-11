import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-user-location',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule
  ],
  templateUrl: './user-location.component.html'
})
export class UserLocationComponent implements OnInit {

  locations: any[] = [];

  
  private API = 'http://localhost:5004/api/dashboard/geo/countries';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any[]>(this.API).subscribe({
      next: res => this.locations = res,
      error: err => console.error('Geo location fetch failed', err)
    });
  }
}
