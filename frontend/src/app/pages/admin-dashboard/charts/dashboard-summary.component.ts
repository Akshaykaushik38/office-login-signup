import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

// Chart.js
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-summary.component.html'
})
export class DashboardSummaryComponent implements OnInit {

  private API = 'http://localhost:5004/api/dashboard';

  // Table data
  statusTable: { status: string; count: number }[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUserStatusStats();
  }

  loadUserStatusStats() {
    this.http.get<any[]>(`${this.API}/user-status`).subscribe({
      next: (data) => {
        this.statusTable = data;
        this.renderPieChart(data);
      },
      error: (err) => {
        console.error('Dashboard summary failed', err);
      }
    });
  }

  renderPieChart(data: any[]) {
    const labels = data.map(d => d.status);
    const values = data.map(d => d.count);

    const canvas = document.getElementById('userStatusPie') as HTMLCanvasElement;
    if (!canvas) return;

    new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: [
            '#4CAF50', 
            '#FFC107', 
            '#F44336'  
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }
}
