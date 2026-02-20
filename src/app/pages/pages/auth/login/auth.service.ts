import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { Student } from 'src/app/model/student/student';
import { ChatVideoService } from 'src/app/pages/apps/chat-video/chat-video.service';
import { StudentService } from 'src/app/pages/apps/student/student.service';
import { NotificationService } from 'src/app/pages/apps/chat-video/notification.service';
import { DataListService } from 'src/app/pages/apps/note/list/data-list.service';
import { environment } from 'src/environments/environment';

interface LoginResponse {
  access_token: string;
  token_type: string;
  user?: {
    id: number;
    email: string;
    role: string;
    active: boolean;
  };
}

interface JwtPayload {
  sub: string;
  role: string;
  user_id: number;
  exp: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loginErrorSubject = new BehaviorSubject<string | null>(null);
  loginError$ = this.loginErrorSubject.asObservable();

  private userNameSubject = new BehaviorSubject<string | null>(null);
  userName$ = this.userNameSubject.asObservable();

  private authenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());

  private cachedUser: any = null;
  private apiUrl = environment.evaBack.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private chatVideoService: ChatVideoService,
    private studentService: StudentService,
    private notificationService: NotificationService,
    private dataListService: DataListService
  ) {
    // Restore username from cached user on startup
    if (this.hasValidToken()) {
      this.getCurrentUserFromApi().subscribe();
    }
  }

  async register(email: string, password: string, studentData: Omit<Student, '_id' | 'email'>) {
    try {
      const res = await firstValueFrom(this.http.post<LoginResponse>(`${this.apiUrl}/auth/register`, {
        name: studentData.name || '',
        email,
        senha_hash: password,
        role: 'cuidador'
      }));

      if (res && res.access_token) {
        localStorage.setItem('eva_jwt_token', res.access_token);
        this.authenticatedSubject.next(true);

        // Create student profile in kids system
        await firstValueFrom(this.http.post(`${this.apiUrl}/kids/students`, {
          name: studentData.name,
          city: studentData.city,
          country: studentData.country,
          gender: studentData.gender,
          phone: studentData.phone,
          image_url: studentData.image_url,
          spoken_language: studentData.spoken_language,
        }));

        this.router.navigate(['/dashboards/analytics']);
      }
    } catch (error) {
      this.loginErrorSubject.next('Registration failed. Please try again.');
    }
  }

  async login(email: string, password: string) {
    try {
      // EVA-back uses OAuth2PasswordRequestForm (application/x-www-form-urlencoded)
      const body = new HttpParams()
        .set('username', email)
        .set('password', password);

      const res = await firstValueFrom(this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }));

      if (res && res.access_token) {
        localStorage.setItem('eva_jwt_token', res.access_token);
        if (res.user) {
          localStorage.setItem('eva_user', JSON.stringify(res.user));
        }
        this.authenticatedSubject.next(true);

        const userId = this.getUID();

        // Update login timestamp on student profile
        if (userId) {
          try {
            const profile = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/kids/profile`));
            if (profile) {
              this.userNameSubject.next(profile.name ?? null);
              // Update online status
              if (profile.id) {
                this.http.put(`${this.apiUrl}/kids/students/${profile.id}/online`, { online: true }).subscribe();
              }
            }
          } catch {
            // Profile may not exist yet - that's ok
          }

          this.notificationService.connect(userId.toString());

          // Initialize WebRTC
          await this.chatVideoService.startLocalStream();
          this.chatVideoService.setCurrentUserId(userId.toString());

          // Update overdue notes
          setTimeout(() => {
            this.dataListService.updateOverdueNotes()
              .catch(() => {});
          }, 0);
        }

        this.loginErrorSubject.next(null);
        this.router.navigate(['/dashboards/analytics']);
      }
    } catch (error) {
      this.loginErrorSubject.next('Incorrect email or password.');
    }
  }

  async logout() {
    try {
      const userId = this.getUID();
      if (userId) {
        // Set offline
        try {
          const profile = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/kids/profile`));
          if (profile?.id) {
            await firstValueFrom(this.http.put(`${this.apiUrl}/kids/students/${profile.id}/online`, { online: false }));
          }
        } catch {}
        this.chatVideoService.endCall();
        this.notificationService.disconnect();
      }

      localStorage.removeItem('eva_jwt_token');
      localStorage.removeItem('eva_user');
      this.authenticatedSubject.next(false);
      this.cachedUser = null;
      this.userNameSubject.next(null);
      this.router.navigate(['/login']);
    } catch (error) {
    }
  }

  isAuthenticated(): Observable<boolean> {
    return this.authenticatedSubject.asObservable();
  }

  getUID(): number | null {
    const token = localStorage.getItem('eva_jwt_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
      return payload.user_id;
    } catch {
      return null;
    }
  }

  getEmail(): string | null {
    const token = localStorage.getItem('eva_jwt_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
      return payload.sub;
    } catch {
      return null;
    }
  }

  getCurrentUser(): any {
    if (this.cachedUser) return this.cachedUser;
    const stored = localStorage.getItem('eva_user');
    if (stored) {
      this.cachedUser = JSON.parse(stored);
      return this.cachedUser;
    }
    return null;
  }

  getCurrentUserFromApi(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/auth/me`).pipe(
      map(user => {
        this.cachedUser = user;
        localStorage.setItem('eva_user', JSON.stringify(user));
        this.userNameSubject.next(user.nome ?? null);
        return user;
      })
    );
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem('eva_jwt_token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
