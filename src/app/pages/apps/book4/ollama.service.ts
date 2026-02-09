import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OllamaService {
  private apiUrl = 'http://localhost:11434/api/generate';

  constructor(private http: HttpClient) { }

  getResponse(prompt: string, model: string): Observable<string> {
    const payload = {
      model: model,
      prompt: prompt,
      stream: true
    };

    const subject = new Subject<string>();

    this.http.post(this.apiUrl, payload, { observe: 'events', reportProgress: true, responseType: 'text' })
      .subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.Response) {
            // Full response
            const body = event.body as string;
            const lines = body.split('\n');
            lines.forEach((line: string) => {
              if (line.trim()) {
                try {
                  const jsonResponse = JSON.parse(line);
                  if (jsonResponse.response) {
                    subject.next(jsonResponse.response);
                  }
                  if (jsonResponse.done) {
                    subject.complete();
                  }
                } catch (e) {
                  console.error('Erro ao processar linha:', e);
                }
              }
            });
          }
        },
        error: (err) => subject.error('Erro na requisição: ' + err.message)
      });

    return subject.asObservable();
  }
}
