import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-clear-calls',
  templateUrl: './clear-calls.component.html',
  styleUrls: ['./clear-calls.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule]
})
export class ClearCallsComponent {
  private apiUrl = `${environment.evaBack.apiUrl}/kids`;

  constructor(private http: HttpClient) { }

  async clearCallsAndSetOffline() {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/admin/clear-calls`, {}));
    } catch (error) {
    }
  }
}
