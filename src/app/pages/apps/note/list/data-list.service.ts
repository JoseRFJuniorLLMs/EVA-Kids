import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { NoteCollection } from '../../note/note-collection';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataListService {
  private apiUrl = `${environment.evaBack.apiUrl}/kids`;
  private _totalNotesOfTheDay: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  get totalNotesOfTheDay$(): Observable<number> {
    return this._totalNotesOfTheDay.asObservable();
  }

  constructor(private http: HttpClient) {
    this.updateOverdueNotes().then(() => this.updateTotalNotesOfTheDay());
  }

  getNotes(): Observable<NoteCollection[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notes`, { params: { permanent: 'false' } }).pipe(
      map(notes => notes.map(n => this.mapToNote(n))),
      catchError(() => of([]))
    );
  }

  getNotesOfTheDay(): Observable<NoteCollection[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notes/today`).pipe(
      map(notes => notes.map(n => this.mapToNote(n))),
      catchError(() => of([]))
    );
  }

  getNoteById(id: string): Observable<NoteCollection> {
    return this.http.get<any>(`${this.apiUrl}/notes/${id}`).pipe(
      map(n => this.mapToNote(n))
    );
  }

  updateNote(id: string, note: Partial<NoteCollection>): Promise<void> {
    return this.http.put<any>(`${this.apiUrl}/notes/${id}`, {
      title: note.title,
      description: note.description,
      answer: note.answer,
      tags: note.tags,
      image: note.image,
      permanent: note.permanent,
      level: note.level,
      last_revision_date: note.last_revision_date,
      next_revision_date: note.next_revision_date,
    }).toPromise()
      .then(() => { this.updateTotalNotesOfTheDay(); })
      .catch(error => { console.error('Erro ao atualizar a nota:', error); });
  }

  deleteNote(id: string): Promise<void> {
    return this.http.delete<any>(`${this.apiUrl}/notes/${id}`).toPromise()
      .then(() => { this.updateTotalNotesOfTheDay(); })
      .catch(error => { console.error('Erro ao excluir a nota:', error); });
  }

  getTotalNotesOfTheDay(): Observable<number> {
    return this.http.get<any[]>(`${this.apiUrl}/notes/today`).pipe(
      map(notes => notes.length),
      catchError(() => of(0))
    );
  }

  updateTotalNotesOfTheDay(): void {
    this.http.get<any[]>(`${this.apiUrl}/notes/today`).pipe(
      catchError(() => of([]))
    ).subscribe(notes => {
      this._totalNotesOfTheDay.next(notes.length);
    });
  }

  updateOverdueNotes(): Promise<void> {
    return this.http.post<any>(`${this.apiUrl}/notes/update-overdue`, {}).toPromise()
      .then(() => {})
      .catch(error => {
        console.error('Erro ao atualizar as notas atrasadas:', error);
      });
  }

  getPermanentNotes(): Observable<NoteCollection[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notes`, { params: { permanent: 'true' } }).pipe(
      map(notes => notes.map(n => this.mapToNote(n))),
      catchError(() => of([]))
    );
  }

  private mapToNote(data: any): NoteCollection {
    return new NoteCollection({
      _id: data.id?.toString(),
      title: data.title,
      description: data.description,
      answer: data.answer,
      tags: data.tags,
      image: data.image,
      permanent: data.permanent,
      level: data.level,
      last_revision_date: data.last_revision_date,
      next_revision_date: data.next_revision_date,
      created_at: data.created_at,
    });
  }
}
