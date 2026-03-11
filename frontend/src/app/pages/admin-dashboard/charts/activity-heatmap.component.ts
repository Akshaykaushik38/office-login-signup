import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-activity-heatmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h3>Login Activity Heatmap</h3>

    <table border="1" width="100%" style="text-align:center">
      <tr>
        <th>Day</th>
        <th>Logins</th>
      </tr>
      <tr>
        <td>Monday</td>
        <td style="background:#c8e6c9">12</td>
      </tr>
      <tr>
        <td>Tuesday</td>
        <td style="background:#a5d6a7">18</td>
      </tr>
      <tr>
        <td>Wednesday</td>
        <td style="background:#81c784">25</td>
      </tr>
      <tr>
        <td>Thursday</td>
        <td style="background:#66bb6a">30</td>
      </tr>
      <tr>
        <td>Friday</td>
        <td style="background:#4caf50">42</td>
      </tr>
    </table>
  `
})
export class ActivityHeatmapComponent {}
