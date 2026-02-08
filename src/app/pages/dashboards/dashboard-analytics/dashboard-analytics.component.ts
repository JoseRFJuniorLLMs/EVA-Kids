import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';

@Component({
  selector: 'vex-dashboard-analytics',
  templateUrl: './dashboard-analytics.component.html',
  styleUrls: ['./dashboard-analytics.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ]
})
export class DashboardAnalyticsComponent implements OnInit {
  isLoading = false;

  ngOnInit(): void {
    // Dashboard simples - sem inicialização complexa
  }
}
