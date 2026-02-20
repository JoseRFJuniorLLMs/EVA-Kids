import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NoteService } from './note.service';
import { NoteCollection } from './note-collection';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
const uuidv4 = () => crypto.randomUUID();
import { RouterModule } from '@angular/router';
import { SoundService } from 'src/app/layouts/components/footer/sound.service';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../pages/auth/login/auth.service';

@Component({
  selector: 'noteinsert',
  standalone: true,
  templateUrl: './noteinsert.component.html',
  styleUrls: ['./noteinsert.component.scss'],
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    DragDropModule,
    FormsModule,
    RouterModule,
    MatTooltipModule,
    MatSelectModule
  ]
})
export class NoteinsertComponent implements OnInit, AfterViewInit {
  noteCollection$ = new Observable<NoteCollection[]>();
  layoutCtrl: any;
  dataSource = new MatTableDataSource<NoteCollection>();
  searchTerm: string = '';

  newNote: NoteCollection = this.createEmptyNote();

  @ViewChild('descriptionInput') descriptionInput!: ElementRef;

  constructor(
    public dialog: MatDialog,
    private noteService: NoteService,
    private soundService: SoundService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.descriptionInput.nativeElement.focus();
    this.pasteFromClipboard();
    this.soundService.playToc();
  }

  createEmptyNote(): NoteCollection {
    return new NoteCollection({
      _id: '',
      created_at: new Date().toISOString(),
      description: '',
      student: undefined,
      tags: '',
      title: '',
      permanent: false,
      answer: '',
      last_revision_date: '',
      next_revision_date: '',
      level: '',
      image: ''
    });
  }

  async pasteFromClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      this.newNote.description = text;
    } catch (err) {
    }
  }

  async createNote(): Promise<void> {
    if (!this.newNote.title || !this.newNote.description) {
      return;
    }

    if (!this.newNote.tags || this.newNote.tags.length === 0) {
      return;
    }

    const uid = this.authService.getUID();
    if (!uid) {
      return;
    }

    this.newNote._id = uuidv4();
    this.newNote.created_at = new Date().toISOString();

    const noteToSave: Partial<NoteCollection> = {
      ...this.newNote,
      student: { _id: uid.toString() }
    };
  
    this.noteService
      .createNote(noteToSave as NoteCollection)
      .then(() => {
        this.resetForm();
        window.close(); // Fechar a página após a criação da nota
      })
      .catch(() => {});
  }
  
  
  resetForm(): void {
    this.newNote = this.createEmptyNote();
  }

  /**
   * Select a tag for the note (kid-friendly button selection)
   */
  selectTag(tag: string): void {
    this.newNote.tags = tag;
    this.soundService.playToc();
  }

  /**
   * Select difficulty level (kid-friendly button selection)
   */
  selectLevel(level: string): void {
    this.newNote.level = level;
    this.soundService.playToc();
  }

  convertToDate(dateString: string | undefined): Date | undefined {
    return dateString ? new Date(dateString) : undefined;
  }

  drop(event: CdkDragDrop<NoteCollection[]>): void {
    const prevIndex = this.dataSource.data.findIndex((d) => d === event.item.data);
    moveItemInArray(this.dataSource.data, prevIndex, event.currentIndex);
    this.dataSource.data = [...this.dataSource.data];
  }
}
