import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Chart } from 'chart.js/auto';
import { NoticeSignalrService } from '../../../services/notice-signalr.service';

@Component({
  selector: 'app-user-status-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<canvas #chartCanvas></canvas>`
})
export class UserStatusChartComponent implements AfterViewInit {

  private API = 'http://localhost:5004/api/admin/dashboard-summary';
  private chart!: Chart;

  @ViewChild('chartCanvas') canvas!: ElementRef<HTMLCanvasElement>;

  constructor(
    private http: HttpClient,
    private signalR: NoticeSignalrService
  ) {}

  private auth() {
    return {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };
  }

  ngAfterViewInit() {
    this.loadChart();

    this.signalR.analyticsUpdated$
      .subscribe(() => this.loadChart());
  }
  refresh() {
    this.loadChart();
  }
  private loadChart() {
    if (!this.canvas) return;

    this.http.get<any>(this.API, this.auth()).subscribe(data => {
      if (this.chart) this.chart.destroy();

      this.chart = new Chart(this.canvas.nativeElement, {
        type: 'pie',
        data: {
          labels: ['Approved', 'Pending'],
          datasets: [{
            data: [data.approvedUsers, data.pendingUsers],
            backgroundColor: ['#4CAF50', '#FFC107']
          }]
        }
      });
    });
  }
}
