import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, Subject, BehaviorSubject } from 'rxjs';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

interface Ebook {
  title: string;
  author: string;
  path: string;
  cover: string;
  pageCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  public totalPages: number = 0;
  public currentPage: number = 0;
  public currentPageTextArray: string[] = [];
  public currentPageText: string = '';
  public currentSentenceIndex: number | null = null;
  public readingInProgress: boolean = false;
  public selectedVoice: SpeechSynthesisVoice | null = null;
  public voices: SpeechSynthesisVoice[] = [];
  public audioMode: boolean = false;
  public currentPageSubject = new Subject<number>();
  public currentPage$ = this.currentPageSubject.asObservable();
  public ebooks: Ebook[] = [];
  private ebooksSubject = new BehaviorSubject<Ebook[]>([]);
  public ebooks$ = this.ebooksSubject.asObservable();

  private pdfDoc: any = null;
  private apiUrl = `${environment.evaBack.apiUrl}/kids`;

  durationInSeconds = 10;
  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  constructor(
    private http: HttpClient,
    private _snackBar: MatSnackBar,
  ) {
    this.loadEbooks();
    this.initializeVoices();
    this.selectedVoice =
      this.voices.find((voice) => voice.name === 'Google US English') || null;
  }

  async saveCurrentPage(ebookId: string): Promise<void> {
    try {
      await this.http.put(`${this.apiUrl}/progress/${ebookId}`, {
        current_page: this.currentPage,
        completed: false
      }).toPromise();
    } catch (error) {
      console.error('Error saving page:', error);
    }
  }

  getCurrentPage(ebookId: string): Observable<number> {
    return this.http.get<any>(`${this.apiUrl}/progress/${ebookId}`).pipe(
      map(data => data?.current_page || 1),
      catchError(() => {
        return new Observable<number>(obs => { obs.next(1); obs.complete(); });
      })
    );
  }

  async markAsCompleted(ebookId: string, completed: boolean): Promise<void> {
    try {
      await this.http.put(`${this.apiUrl}/progress/${ebookId}`, {
        current_page: this.currentPage,
        completed
      }).toPromise();
    } catch (error) {
      console.error('Error marking as completed:', error);
    }
  }

  getCompletionStatus(ebookId: string): Observable<boolean> {
    return this.http.get<any>(`${this.apiUrl}/progress/${ebookId}`).pipe(
      map(data => data?.completed || false),
      catchError(() => {
        return new Observable<boolean>(obs => { obs.next(false); obs.complete(); });
      })
    );
  }

  async loadEbooks(): Promise<void> {
    this.http.get<Ebook[]>('../../../../assets/pdf/clasepdf.json').subscribe(
      (data) => {
        if (data) {
          this.ebooks = data;
          this.ebooksSubject.next(this.ebooks);
        }
      },
      (error: HttpErrorResponse) => {
        this.handleError(error);
      }
    );
  }

  getEbooks(): Observable<Ebook[]> {
    return this.ebooks$;
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error.message);
    return throwError('Something bad happened; please try again later.');
  }

  private async initializeViewer(filePath: string, containerId: string): Promise<void> {
    this.openSnackBar('Initializing Viewer...');
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error('Container not found');
    }
    container.innerHTML = '';

    const pdfViewer = document.createElement('ngx-extended-pdf-viewer');
    pdfViewer.setAttribute('src', filePath);
    container.appendChild(pdfViewer);
  }

  async initializeBook(filePath: string, containerId: string): Promise<void> {
    this.openSnackBar('Initializing Book...');
    try {
      await this.initializeViewer(filePath, containerId);
    } catch (error) {
      console.error('Error loading or rendering book: ', error);
    }
  }

  async renderPage(pageNumber: number, container: HTMLElement): Promise<void> {
  }

  loadBookFromArrayBuffer(arrayBuffer: ArrayBuffer, containerId: string): void {
    const fileURL = URL.createObjectURL(new Blob([arrayBuffer], { type: 'application/pdf' }));
    this.initializeBook(fileURL, containerId);
  }

  async updateCurrentPage(containerId: string): Promise<void> {
    const container = document.getElementById(containerId);
    if (this.pdfDoc && container) {
      await this.renderPage(this.currentPage, container);
      this.openSnackBar(`Current page: ${this.currentPage} / ${this.totalPages}`);
      if (this.audioMode && this.readingInProgress) {
        await this.processCurrentPageAudio();
      }
    }
  }

  async processCurrentPageAudio(): Promise<void> {
    this.currentPageTextArray = this.splitIntoSentences(this.currentPageText);
    this.currentSentenceIndex = 0;
    if (this.audioMode && this.readingInProgress) {
      this.openSnackBar('Processing current page audio.');
    }
  }

  splitIntoSentences(text: string): string[] {
    return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  }

  startReadingMode(): void {
    this.openSnackBar('Start Reading Mode');
    this.audioMode = false;
    this.readingInProgress = false;
    speechSynthesis.cancel();
  }

  startAudioMode(): void {
    this.openSnackBar('Start Audio Mode');
    this.audioMode = true;
    this.readingInProgress = true;
    this.processCurrentPageAudio();
  }

  pauseReading(): void {
    this.openSnackBar('Pause Reading');
    speechSynthesis.pause();
    this.readingInProgress = false;
  }

  resumeReading(): void {
    this.openSnackBar('Resume Reading');
    speechSynthesis.resume();
    this.readingInProgress = true;
    if (this.currentSentenceIndex !== null) {
      this.processCurrentPageAudio();
    }
  }

  nextPage(containerId: string, ebookId: string): void {
    this.openSnackBar('Next Page');
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateCurrentPage(containerId);
      this.saveCurrentPage(ebookId);
    }
  }

  prevPage(containerId: string, ebookId: string): void {
    this.openSnackBar('Previous Page');
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateCurrentPage(containerId);
      this.saveCurrentPage(ebookId);
    }
  }

  async selectVoice(voice: SpeechSynthesisVoice) {
    if (this.selectedVoice === voice) {
      return;
    }
    if (this.readingInProgress) {
      speechSynthesis.cancel();
    }
    this.selectedVoice = voice;
    if (this.audioMode) {
      await this.processCurrentPageAudio();
    }
  }

  initializeVoices(): Promise<void> {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        this.voices = speechSynthesis.getVoices();
        this.selectedVoice =
          this.voices.find((voice) => voice.name === 'Google US English') ||
          null;
        speechSynthesis.onvoiceschanged = () => {
          this.voices = speechSynthesis.getVoices();
          this.selectedVoice =
            this.voices.find(
              (voice) => voice.name === 'Google US English'
            ) || null;
          resolve();
        };
      } else {
        resolve();
      }
    });
  }

  openSnackBar(message: string): void {
    this._snackBar.open(message, 'Close', {
      duration: this.durationInSeconds * 200,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition
    });
  }
}
