import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { Router, RouterModule } from '@angular/router';

import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';

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

  constructor(
    private dataListService: DataListService,
    private voiceService: UnifiedVoiceService,
    private router: Router
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
    this.router.navigate(['/apps/note-edit', note._id]);
  }

  viewNote(note: NoteCollection): void {
    this.router.navigate(['/apps/note-view', note._id]);
  }

  deleteNote(id: string): void {
    this.dataListService.deleteNote(id);
  }

  openFlashcard(): void {
    this.router.navigate(['/apps/flashcard']);
  }

  openSRVP(): void {
    this.router.navigate(['/apps/srvp']);
  }

  // ==================== HELPER METHODS FOR KIDS UI ====================

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

  getTagEmoji(tags: string | undefined): string {
    if (!tags) return '\u{1F4DD}';
    const emojiMap: Record<string, string> = {
      'VERB': '\u{1F3C3}',
      'NOUN': '\u{1F381}',
      'BOOK': '\u{1F4DA}',
      'CLASS': '\u{1F3EB}',
      'GAME': '\u{1F3AE}',
      'MUSIC': '\u{1F3B5}'
    };
    return emojiMap[tags.toUpperCase()] || '\u{1F4DD}';
  }

  getTagText(tags: string | undefined): string {
    if (!tags) return 'Nota';
    const textMap: Record<string, string> = {
      'VERB': 'Verbo',
      'NOUN': 'Nome',
      'BOOK': 'Livro',
      'CLASS': 'Aula',
      'GAME': 'Jogo',
      'MUSIC': 'M\u00fasica'
    };
    return textMap[tags.toUpperCase()] || tags || 'Nota';
  }

  getLevelEmoji(level: string | undefined): string {
    if (!level) return '\u{2B50}';
    const emojiMap: Record<string, string> = {
      'easy': '\u{1F60A}',
      'medium': '\u{1F914}',
      'hard': '\u{1F9E0}'
    };
    return emojiMap[level.toLowerCase()] || '\u{2B50}';
  }

  getLevelText(level: string | undefined): string {
    if (!level) return 'Normal';
    const textMap: Record<string, string> = {
      'easy': 'F\u00e1cil',
      'medium': 'M\u00e9dio',
      'hard': 'Dif\u00edcil'
    };
    return textMap[level.toLowerCase()] || level || 'Normal';
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
