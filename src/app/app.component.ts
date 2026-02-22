import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WebMCPToolsService } from './core/services/webmcp/webmcp-tools.service';

@Component({
  selector: 'vex-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterOutlet]
})
export class AppComponent implements OnInit {
  constructor(private webmcp: WebMCPToolsService) {}

  ngOnInit(): void {
    this.webmcp.init().catch(console.warn);
  }
}
