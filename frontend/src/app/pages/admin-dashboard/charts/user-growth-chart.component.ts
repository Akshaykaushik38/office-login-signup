import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Chart } from 'chart.js/auto';
import { NoticeSignalrService } from '../../../services/notice-signalr.service';

@Component({
  selector: 'app-user-growth-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<canvas #chartCanvas></canvas>`
})
export class UserGrowthChartComponent implements AfterViewInit {

  private API = 'http://localhost:5004/api/admin/user-growth';
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

    this.http.get<any[]>(this.API, this.auth()).subscribe(data => {
      if (this.chart) this.chart.destroy();

      this.chart = new Chart(this.canvas.nativeElement, {
        type: 'bar',
        data: {
          labels: data.map(x => x.month),
          datasets: [{
            label: 'Users',
            data: data.map(x => x.count),
            backgroundColor: '#2196F3'
          }]
        }
      });
    });
  }
}
