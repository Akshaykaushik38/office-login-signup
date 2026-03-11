import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-growth',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h3>User Growth</h3>
    <ul>
      <li>Jan: 5 users</li>
      <li>Feb: 8 users</li>
      <li>Mar: 14 users</li>
    </ul>
  `
})
export class UserGrowthComponent {}
