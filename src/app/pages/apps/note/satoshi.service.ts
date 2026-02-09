import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SatoshiService {
  private apiUrl = `${environment.evaBack.apiUrl}/kids`;

  constructor(private http: HttpClient) {}

  getSatoshiBalance(studentId: string): Observable<number> {
    return this.http.get<any>(`${this.apiUrl}/satoshi`).pipe(
      map(res => res.satoshi_balance || 0),
      catchError(() => of(0))
    );
  }

  incrementSatoshi(studentId: string, amount: number): Observable<number> {
    return this.http.post<any>(`${this.apiUrl}/satoshi/increment`, { amount }).pipe(
      map(res => res.satoshi_balance || 0),
      catchError(() => of(0))
    );
  }
}
