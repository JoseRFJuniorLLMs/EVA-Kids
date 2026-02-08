import { Component, ElementRef, Inject, Input, OnInit, ViewChild, NgZone, ChangeDetectorRef, AfterViewInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import WaveSurfer from 'wavesurfer.js';
import screenfull from 'screenfull';

import { SoundService } from 'src/app/layouts/components/footer/sound.service';
import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';
import { vocabulary } from './vocabulary';
import { VEX_THEMES } from '@vex/config/config.token';
import { SatoshiService } from '../note/satoshi.service';

@Component({
  selector: 'app-game5',
  templateUrl: './game5-component.html',
  styleUrls: ['./game5-component.scss'],
  animations: [stagger40ms, fadeInUp400ms],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, 
    MatExpansionModule,
    MatTooltipModule,
    MatBadgeModule,
    MatBottomSheetModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatSliderModule,
    FormsModule
  ]
})
export class Game5Component implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild('mic') micElement!: ElementRef<HTMLDivElement>;
  @ViewChild('tableContainer') tableContainer!: ElementRef<HTMLDivElement>;

  student$!: Observable<any[]>;

  constructor(
    @Inject(VEX_THEMES) public readonly themes: any[],
    public voiceService: UnifiedVoiceService,
    public soundService: SoundService,
    private renderer: Renderer2,
    private satoshiService: SatoshiService
  ) {}

  vocabulary = this.shuffleArray(vocabulary); // Embaralhar o vocabulário ao inicializar
  currentIndex = 0;
  phases = ['english', 'pronunciation', 'translation', 'association'];
  currentPhase = this.phases[0];
  score = 0;

  errorIndices: Set<number> = new Set<number>();
  correctEnglish: boolean[] = [];
  correctPronunciation: boolean[] = [];

  private studentId = 'student-id'; 
  totalSatoshis = 0; // Adicionar o total de Satoshis
  showSatoshiAlert = false;

  ngOnInit(): void {
    this.voiceService.usePreset('game');
    this.correctEnglish = new Array(this.vocabulary.length).fill(false);
    this.correctPronunciation = new Array(this.vocabulary.length).fill(false);
    this.voiceService.startListening();

    this.voiceService.command$.pipe(takeUntil(this.destroy$)).subscribe((transcript: string) => {
      const currentWord = this.vocabulary[this.currentIndex].english;
      if (transcript.trim().toLowerCase() === currentWord.toLowerCase() && !this.correctEnglish[this.currentIndex]) {
        this.correctEnglish[this.currentIndex] = true;
        this.soundService.playDone();
        this.markRowAsCorrect(this.currentIndex);
        this.score++;
        this.incrementSatoshi();
        this.next();
      } else {
        this.soundService.playErro();
        this.markError(this.currentIndex);
        this.score--;
        this.next();
      }
    });

    if (this.currentPhase === 'english') {
      const currentWord = this.vocabulary[this.currentIndex].english;
      this.voiceService.speak(currentWord);
    }

    this.updateSatoshiBalance();
  }

  updateSatoshiBalance() {
    this.satoshiService.getSatoshiBalance(this.studentId).pipe(takeUntil(this.destroy$)).subscribe(
      balance => {
        this.totalSatoshis = balance;
      },
      error => console.error('Error fetching satoshi balance:', error)
    );
  }

  private incrementSatoshi() {
    this.satoshiService.incrementSatoshi(this.studentId, 1).subscribe(
      newBalance => {
        this.totalSatoshis = newBalance;
        this.showSatoshiAlert = true;
        setTimeout(() => this.showSatoshiAlert = false, 2000);
      },
      error => console.error('Erro ao incrementar saldo de satoshi:', error)
    );
  }

  shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  next(): void {
    if (this.currentIndex < this.vocabulary.length - 1) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0; // Reinicia do começo se desejado
    }
    this.currentPhase = this.phases[0]; // Reinicia a fase
    const currentWord = this.vocabulary[this.currentIndex].english;
    this.voiceService.speak(currentWord);
    this.scrollToCurrentElement();
  }

  scrollToCurrentElement(): void {
    setTimeout(() => {
      const currentElement = document.querySelector(`tr:nth-child(${this.currentIndex + 2})`); // +2 to account for the header row
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  markError(index: number): void {
    this.errorIndices.add(index);
  }

  isError(index: number): boolean {
    return this.errorIndices.has(index);
  }

  isCovered(index: number, phase: string): boolean {
    return index !== this.currentIndex || phase !== this.currentPhase;
  }

  isShown(index: number): boolean {
    return index < this.currentIndex || (index === this.currentIndex && this.phases.indexOf(this.currentPhase) > this.phases.indexOf('english'));
  }

  isCorrect(index: number): boolean {
    return this.correctEnglish[index] && this.correctPronunciation[index];
  }

  onVoiceChange(event: Event): void {
    const selectedVoiceName = (event.target as HTMLSelectElement).value;
    this.voiceService.setVoice(selectedVoiceName);
  }

  ngAfterViewInit(): void {
    this.voiceService.setupWaveSurfer(this.micElement);
    this.addClickEventToCells();
  }

  addClickEventToCells(): void {
    const cells = document.querySelectorAll('td');
    cells.forEach(cell => {
      this.renderer.listen(cell, 'click', () => {
        this.score--;
        this.soundService.playErro();
        this.markError(this.currentIndex);
        this.next();
      });
      this.renderer.setStyle(cell, 'cursor', 'pointer');
    });
  }

  markRowAsCorrect(index: number): void {
    const row = document.querySelector(`tr:nth-child(${index + 2})`); // +2 to account for the header row
    if (row) {
      row.classList.add('correct');
      const heartIcon = document.createElement('i');
      heartIcon.className = 'fa-solid fa-heart';
      row.appendChild(heartIcon);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.voiceService.stopListening();
    this.voiceService.stopRecording();

    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
  }
}
