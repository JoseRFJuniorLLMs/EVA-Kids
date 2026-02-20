import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { Observable, of, firstValueFrom } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { NoteCollection } from './note-collection';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private apiUrl = `${environment.evaBack.apiUrl}/kids`;
  noteCollection$!: Observable<NoteCollection[]>;

  durationInSeconds = 90;
  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  private readonly SATOSHIS_PER_NOTE = 1;

  constructor(
    private http: HttpClient,
    private _snackBar: MatSnackBar,
  ) {
    this.noteCollection$ = this.getNotes();
  }

  getNotes(): Observable<NoteCollection[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notes`).pipe(
      map(notes => notes.map(n => this.mapToNote(n))),
      catchError(() => of([]))
    );
  }

  getNoteById(id: string): Observable<NoteCollection> {
    return this.http.get<any>(`${this.apiUrl}/notes/${id}`).pipe(
      map(n => this.mapToNote(n))
    );
  }

  async createNote(note: NoteCollection): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/notes`, {
        title: note.title,
        description: note.description,
        answer: note.answer,
        tags: note.tags,
        image: note.image,
        permanent: note.permanent ?? false,
        level: note.level,
        last_revision_date: note.last_revision_date,
        next_revision_date: note.next_revision_date,
      }));
      this.openSnackBar('Create Note OK !');
      // Satoshi increment is automatic on the backend
    } catch (error) {
    }
  }

  async updateNote(id: string, note: Partial<NoteCollection>): Promise<void> {
    try {
      await firstValueFrom(this.http.put(`${this.apiUrl}/notes/${id}`, {
        title: note.title,
        description: note.description,
        answer: note.answer,
        tags: note.tags,
        image: note.image,
        permanent: note.permanent,
        level: note.level,
        last_revision_date: note.last_revision_date,
        next_revision_date: note.next_revision_date,
      }));
      this.openSnackBar('Update Note OK !');
    } catch (error) {
    }
  }

  async deleteNote(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/notes/${id}`));
      this.openSnackBar('Delete Note OK !');
    } catch (error) {
    }
  }

  formatNoteDate(note: NoteCollection): NoteCollection {
    if (note.created_at && typeof note.created_at === 'string') {
      note.created_at = new Date(note.created_at).toISOString();
    }
    return note;
  }

  openSnackBar(message: string): void {
    this._snackBar.open(message, 'Close', {
      duration: this.durationInSeconds * 1000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition
    });
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
