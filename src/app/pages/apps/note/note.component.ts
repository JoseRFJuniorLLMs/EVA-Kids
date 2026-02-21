import { Component, OnInit, OnDestroy } from '@angular/core';
import { NoteService } from './note.service';
import { NoteCollection } from './note-collection';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { UnifiedVoiceService } from '../../../core/services/voice/unified-voice.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'notes',
  standalone: true,
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    DragDropModule,
    MatTooltipModule,
    FormsModule,
    RouterModule
  ]
})
export class NoteComponent implements OnInit, OnDestroy {
  // Cleanup subject for memory leak prevention
  private destroy$ = new Subject<void>();

  notes$!: Observable<NoteCollection[]>;
  filteredNotes$!: Observable<NoteCollection[]>;
  searchTerm: string = '';

  constructor(
    private noteService: NoteService,
    private voiceService: UnifiedVoiceService,
    private router: Router
  ) {}

  trackById(index: number, noteCollection: NoteCollection): string | number {
    return noteCollection._id;
  }

  ngOnInit(): void {
    this.loadNotes();
  }

  loadNotes(): void {
    this.notes$ = this.noteService.noteCollection$;
    this.notes$.pipe(takeUntil(this.destroy$)).subscribe(notes => {
    });
  }

  /* createNote(): void {
    const newNote = new NoteCollection({
      _id: '', 
      created_at: new Date().toISOString(),
      description: '',
      student: { _id: '123' }, 
      tags: '',
      title: '',
      permanent: false 
    });
    this.noteService
      .createNote(newNote)
      .then(() => {
        this.loadNotes();
      })
      .catch((error) => {
        console.error('Error creating note:', error);
      });
  }
 */
  updateNote(id: string, noteData: Partial<NoteCollection>): void {
    this.noteService
      .updateNote(id, noteData)
      .then(() => {
        this.loadNotes();
      })
      .catch(() => {});
  }

  deleteNote(id: string): void {
    this.noteService
      .deleteNote(id)
      .then(() => {
        this.loadNotes();
      })
      .catch(() => {});
  }

  togglePermanent(note: NoteCollection): void {
    const updatedNote = { ...note, permanent: !note.permanent };
    this.noteService
      .updateNote(note._id, updatedNote)
      .then(() => {
        this.loadNotes();
      })
      .catch(() => {});
  }

  convertToDate(dateString: string | undefined): Date | undefined {
    return dateString ? new Date(dateString) : undefined;
  }

  drop(event: CdkDragDrop<NoteCollection[]>): void {
    this.notes$.pipe(takeUntil(this.destroy$)).subscribe(notes => {
      const prevIndex = notes.findIndex((d) => d === event.item.data);
      moveItemInArray(notes, prevIndex, event.currentIndex);
    });
  }

  speak(note: NoteCollection): void {
    const text = `
      Title: ${note.title},
      Description: ${note.description},
      Tags: ${note.tags},
      Permanent: ${note.permanent ? 'Yes' : 'No'},
      Created at: ${this.convertToDate(note.created_at)?.toLocaleDateString() ?? 'Unknown'}
    `;
    this.voiceService.speak(text);
  }

  reviewNote(note: NoteCollection, correctAnswer: boolean): void {
    const response = correctAnswer ? 'good' : 'fail';
    note.calculateNextReview(response);
    this.updateNote(note._id, note);
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchTerm = filterValue.trim().toLowerCase();
  }

  openFlashcard(): void {
    this.router.navigate(['/apps/flashcard']);
  }

  /* editNote(note: NoteCollection): void {
      const dialogRef = this.dialog.open(NoteEditComponent, {
        width: '400px',
        data: { note }
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.updateNote(note._id, result);
        }
      });
    }
 */
  ngOnDestroy(): void {
    // Complete destroy$ to unsubscribe all subscriptions
    this.destroy$.next();
    this.destroy$.complete();

    // Cancel any browser speech synthesis
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
  }

  // ==================== HELPER METHODS FOR KIDS UI ====================

  /**
   * Get CSS class based on tag type
   */
  getTagClass(tags: string | undefined): string {
    if (!tags) return 'tag-default';
    const tagMap: Record<string, string> = {
      'VERB': 'tag-verb',
      'NOUN': 'tag-noun',
      'BOOK': 'tag-book',
      'CLASS': 'tag-class',
      'GAME': 'tag-game',
      'MUSIC': 'tag-music'
    };
    return tagMap[tags.toUpperCase()] || 'tag-default';
  }

  /**
   * Get emoji based on tag type
   */
  getTagEmoji(tags: string | undefined): string {
    if (!tags) return '📝';
    const emojiMap: Record<string, string> = {
      'VERB': '🏃',
      'NOUN': '🎁',
      'BOOK': '📚',
      'CLASS': '🏫',
      'GAME': '🎮',
      'MUSIC': '🎵'
    };
    return emojiMap[tags.toUpperCase()] || '📝';
  }

  /**
   * Get human-readable text for tag
   */
  getTagText(tags: string | undefined): string {
    if (!tags) return 'Nota';
    const textMap: Record<string, string> = {
      'VERB': 'Verbo',
      'NOUN': 'Nome',
      'BOOK': 'Livro',
      'CLASS': 'Aula',
      'GAME': 'Jogo',
      'MUSIC': 'Música'
    };
    return textMap[tags.toUpperCase()] || tags || 'Nota';
  }

  /**
   * Get emoji based on difficulty level
   */
  getLevelEmoji(level: string | undefined): string {
    if (!level) return '⭐';
    const emojiMap: Record<string, string> = {
      'easy': '😊',
      'medium': '🤔',
      'hard': '🧠'
    };
    return emojiMap[level.toLowerCase()] || '⭐';
  }

  /**
   * Get human-readable text for level
   */
  getLevelText(level: string | undefined): string {
    if (!level) return 'Normal';
    const textMap: Record<string, string> = {
      'easy': 'Fácil',
      'medium': 'Médio',
      'hard': 'Difícil'
    };
    return textMap[level.toLowerCase()] || level || 'Normal';
  }

  /**
   * Handle image loading error
   */
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
