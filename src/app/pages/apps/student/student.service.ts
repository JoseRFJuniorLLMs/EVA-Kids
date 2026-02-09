import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Student } from 'src/app/model/student/student';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = `${environment.evaBack.apiUrl}/kids`;
  private studentsSubject = new BehaviorSubject<Student[]>([]);

  constructor(private http: HttpClient) {}

  getStudentData(): Observable<Student | null> {
    return this.http.get<any>(`${this.apiUrl}/profile`).pipe(
      map(data => this.mapToStudent(data)),
      catchError(() => of(null))
    );
  }

  getStudents(): Observable<Student[]> {
    return this.http.get<any[]>(`${this.apiUrl}/students`).pipe(
      map(list => list.map(s => this.mapToStudent(s))),
      tap(students => this.studentsSubject.next(students)),
      catchError(() => of([]))
    );
  }

  addStudentData(student: Student): Promise<void> {
    return this.http.post<any>(`${this.apiUrl}/students`, {
      name: student.name,
      city: student.city,
      country: student.country,
      gender: student.gender,
      phone: student.phone,
      image_url: student.image_url,
      spoken_language: student.spoken_language,
    }).toPromise().then(() => {});
  }

  updateStudentData(student: Student): Promise<void> {
    return this.http.put<any>(`${this.apiUrl}/profile`, {
      name: student.name,
      city: student.city,
      country: student.country,
      gender: student.gender,
      phone: student.phone,
      image_url: student.image_url,
      spoken_language: student.spoken_language,
      status: student.status,
    }).toPromise().then(() => {});
  }

  deleteStudentData(id: string): Promise<void> {
    // Students are not deleted via kids API - they are linked to usuarios
    return Promise.resolve();
  }

  getLastLogin(loginHistory?: string[]): string {
    return loginHistory && loginHistory.length > 0 ? loginHistory[loginHistory.length - 1] : 'N/A';
  }

  private mapToStudent(data: any): Student {
    return new Student({
      _id: data.usuario_id?.toString() || data.id?.toString(),
      name: data.name || data.usuario_nome,
      email: data.email,
      city: data.city,
      country: data.country,
      gender: data.gender,
      phone: data.phone,
      image_url: data.image_url,
      spoken_language: data.spoken_language,
      status: data.status,
      online: data.online,
      satoshiBalance: data.satoshi_balance,
      lastLogin: data.last_login,
      loginHistory: data.login_history || [],
    });
  }
}
