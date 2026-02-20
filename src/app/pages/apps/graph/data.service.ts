import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import words from '../../../../assets/json/word.json';
import { NoteCollection } from '../note/note-collection';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private primeToTarget: { [key: string]: string } = {};
  private colorMapping: { [key: string]: string } = {};
  private apiUrl = `${environment.evaBack.apiUrl}/kids`;

  noteCollection$!: Observable<NoteCollection[]>;

  durationInSeconds = 90;
  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  constructor(
    private http: HttpClient,
    private _snackBar: MatSnackBar,
  ) {
    this.loadPrimeToTargetMapping();
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

  private loadPrimeToTargetMapping() {
    words.forEach((wordObj: any) => {
      const prime = wordObj['prime'].toLowerCase();
      const target = wordObj['target'].toLowerCase();
      this.primeToTarget[prime] = target;
      const color = this.getRandomColor();
      this.colorMapping[prime] = color;
      this.colorMapping[target] = color;
    });
  }

  getPrimeToTargetMapping(): { [key: string]: string } {
    return this.primeToTarget;
  }

  getColorMapping(): { [key: string]: string } {
    return this.colorMapping;
  }

  private getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  getSentences(): Observable<any[]> {
    return this.getNotes().pipe(
      map((notes: NoteCollection[]) => {
        const uniqueSentences = new Set<string>();
        const noteByDescription = new Map<string, NoteCollection>();

        notes.forEach((note: NoteCollection) => {
          const sentence = note.description;
          if (sentence) {
            uniqueSentences.add(sentence);
            if (!noteByDescription.has(sentence)) {
              noteByDescription.set(sentence, note);
            }
          }
        });

        return Array.from(uniqueSentences).map((sentence, index) => {
          const note = noteByDescription.get(sentence);
          return {
            id: index + 1,
            label: sentence,
            tag: note?.tags || 'geral',
            image: note?.image
          };
        });
      })
    );
  }

  tokenize(text: string): string[] {
    return text.toLowerCase().split(/\W+/).filter(Boolean);
  }

  getCommonWordsMap(nodes: any[]): Map<string, number[]> {
    const wordMap = new Map<string, number[]>();

    const primeWords = Object.keys(this.primeToTarget);
    const targetWords = Object.values(this.primeToTarget);

    nodes.forEach((node) => {
      const wordsInNode = this.tokenize(node.label);
      const commonWords = wordsInNode.filter(word => primeWords.includes(word) || targetWords.includes(word));

      commonWords.forEach((word) => {
        if (wordMap.has(word)) {
          wordMap.get(word)!.push(node.id);
        } else {
          wordMap.set(word, [node.id]);
        }
      });
    });

    return wordMap;
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
