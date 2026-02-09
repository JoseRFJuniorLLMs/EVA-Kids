import { Component, Inject, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoteCollection } from '../../note/note-collection';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';
import { DataListService } from './data-list.service';
import { format } from 'date-fns';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-flashcard',
  templateUrl: './flashcard.component.html',
  styleUrls: ['./flashcard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule
  ],
  animations: [
    trigger('fade', [
      transition('void => *', [
        style({ opacity: 0 }),
        animate(1000, style({ opacity: 1 }))
      ]),
      transition('* => void', [
        animate(1000, style({ opacity: 0 }))
      ])
    ])
  ],
  providers: [DataListService]
})
export class FlashcardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('waveform') waveformElement!: ElementRef;

  currentNoteIndex: number = 0;
  showTranslation: boolean = false;
  notesOfTheDay: NoteCollection[] = [];
  reviewCompleted: boolean = false;
  voices: SpeechSynthesisVoice[] = [];
  selectedVoice: SpeechSynthesisVoice | null = null;
  audioAvailable = false;

  constructor(
    public dialogRef: MatDialogRef<FlashcardComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { notes: NoteCollection[] },
    private dataService: DataListService,
    private voiceService: UnifiedVoiceService
  ) {
    this.loadNotesOfTheDay();
    this.loadVoices();
  }
  
  get currentNote(): NoteCollection {
    return this.notesOfTheDay[this.currentNoteIndex];
  }

  loadNotesOfTheDay(): void {
    this.dataService.getNotesOfTheDay().subscribe({
      next: (notes: NoteCollection[]) => {
        this.notesOfTheDay = notes.map(note => new NoteCollection(note));
        if (this.notesOfTheDay.length > 0) {
          this.currentNoteIndex = 0;
        } else {
          this.reviewCompleted = true;
        }
      },
      error: (error) => {
        console.error('Error loading notes of the day:', error);
      }
    });
  }

  loadVoices(): void {
    const synth = window.speechSynthesis;
    this.voices = synth.getVoices();
    if (this.voices.length === 0) {
      synth.onvoiceschanged = () => {
        this.voices = synth.getVoices();
      };
    }
  }

  ngOnInit() {
    this.audioAvailable = this.checkAudioAvailability();
  }
  
  checkAudioAvailability(): boolean {
    return true; 
  }

  ngAfterViewInit(): void {
    if (this.voiceService) {
      this.voiceService.setupWaveSurfer(this.waveformElement);
    } else {
      console.error('voiceService is not initialized');
    }
  }
  
  ngOnDestroy(): void {
    if (this.voiceService && this.voiceService.wavesurfer) {
      this.voiceService.wavesurfer.destroy();
    }
  }

  toggleTranslation(): void {
    this.showTranslation = !this.showTranslation;

    if (this.currentNote && this.currentNote.description) {
      this.voiceService.speakAndVisualize(this.currentNote.description, this.waveformElement, this.selectedVoice);
    }
  }

  showNextNote(): void {
    this.showTranslation = false;
    this.currentNoteIndex++;
    if (this.currentNoteIndex >= this.notesOfTheDay.length) {
      this.reviewCompleted = true;
    }
  }

  showTranslationAndSpeak(): void {
    this.showTranslation = true;
    if (this.currentNote && this.currentNote.answer) {
      //TO DO: 
    }
  }

  answer(response: 'fail' | 'hard' | 'good' | 'easy'): void {
    this.updateNoteReviewDate(response);
    this.showNextNote();
  }

  updateNoteReviewDate(response: 'fail' | 'hard' | 'good' | 'easy'): void {
    const note = this.currentNote;
    const today = new Date();

    note.last_revision_date = format(today, 'yyyy-MM-dd');

    if (typeof note.calculateNextReview === 'function') {
      note.calculateNextReview(response);
    } else {
      console.error('calculateNextReview is not a function');
    }

    this.dataService.updateNote(note._id, {
      last_revision_date: note.last_revision_date,
      next_revision_date: note.next_revision_date
    }).then(() => {
    }).catch(error => {
      console.error('Error updating note:', error);
    });
  }

  onVoiceChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedVoiceName = selectElement.value;
    this.selectedVoice = this.voices.find(voice => voice.name === selectedVoiceName) || null;
  }

  playAudio(): void {
    if (this.voiceService.wavesurfer) {
      this.voiceService.wavesurfer.playPause();
    }
  }

  closeClick(): void {
    this.dialogRef.close();
  }
}
