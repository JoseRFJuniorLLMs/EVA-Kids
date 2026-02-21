import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { RouterModule } from '@angular/router';

import { FlashcardComponent } from './flashcard.component';
import { NoteDialogComponent } from './note-dialog.component';
import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';
import { RsvpreaderComponent } from '../../../dashboards/components/dialog-rsvpreader/rsvpreader.component';
import { NoteDialogEditComponent } from './note-dialog-edit.component';

import { DataListService } from './data-list.service';
import { NoteCollection } from '../../note/note-collection';

@Component({
  selector: 'note-list',
  templateUrl: './note-list.component.html',
  styleUrls: ['./note-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    MatBadgeModule,
    RouterModule
  ]
})
export class NoteListComponent implements OnInit, OnDestroy {

  notes$!: Observable<NoteCollection[]>;
  filteredNotes$!: Observable<NoteCollection[]>;
  totalNotes$: Observable<number>; 
  searchTerm: string = '';
  private flashcardDialogRef: any;
  private srvpDialogRef: any;

  constructor(
    private dataListService: DataListService,
    public dialog: MatDialog,
    private voiceService: UnifiedVoiceService
  ) {
    this.totalNotes$ = this.dataListService.getTotalNotesOfTheDay();
  }

  ngOnInit(): void {
    this.notes$ = this.dataListService.getNotes();
    this.filteredNotes$ = this.notes$;
  }

  ngOnDestroy(): void {
    if (this.voiceService && this.voiceService.wavesurfer) {
      this.voiceService.wavesurfer.destroy();
    }
    // Additional cleanup - stop any speech synthesis
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
  }

  searchNotes(): void {
    this.filteredNotes$ = this.notes$.pipe(
      map((notes: NoteCollection[]) => notes.filter((note: NoteCollection) => note.title?.toLowerCase().includes(this.searchTerm.toLowerCase())))
    );
  }

  editNote(note: NoteCollection): void {
    const dialogRef = this.dialog.open(NoteDialogEditComponent, {
      width: '80vw',  // 80% da largura da viewport
      height: '80vh', // 80% da altura da viewport
      data: note
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dataListService.updateNote(note._id, result);
      }
    });
  }

  viewNote(note: NoteCollection): void {
    const dialogRef = this.dialog.open(NoteDialogComponent, {
      width: '80vw',  // 80% da largura da viewport
      height: '80vh', // 80% da altura da viewport
      data: note
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dataListService.updateNote(note._id, result);
      }
    });
  }

  deleteNote(id: string): void {
    this.dataListService.deleteNote(id);
  }

  openFlashcard(): void {
    this.filteredNotes$.pipe(take(1)).subscribe(notes => {
      if (!this.flashcardDialogRef) {
        this.flashcardDialogRef = this.dialog.open(FlashcardComponent, {
          width: '80vw',
          height: '80vh',
          data: { notes },
          hasBackdrop: false
        });

        this.flashcardDialogRef.afterClosed().subscribe(() => {
          this.flashcardDialogRef = null;
        });
      } else {
        this.flashcardDialogRef.componentInstance.updateNotes(notes);
      }
    });
  }

  openSRVP(): void {
    this.filteredNotes$.pipe(take(1)).subscribe(notes => {
      const combinedText = notes.map(note => note.description).join(' '); // Concatena as descrições das notas
      if (!this.srvpDialogRef) {
        this.srvpDialogRef = this.dialog.open(RsvpreaderComponent, {
          width: '80vw',
          height: '80vh',
          data: { texto: combinedText }, // Passa o texto combinado para o componente `RsvpreaderComponent`
          hasBackdrop: false
        });
  
        this.srvpDialogRef.afterClosed().subscribe(() => {
          this.srvpDialogRef = null;
        });
      }
    });
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
