import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, Renderer2, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
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
import { vocabulary } from './vocabulary';
import { VEX_THEMES } from '@vex/config/config.token';
import { BaseVoiceGame } from '../voice-game/base-voice-game';
import { VoiceGameConfig } from '../voice-game/voice-game.models';

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
export class Game5Component extends BaseVoiceGame implements OnInit, AfterViewInit {
  @ViewChild('tableContainer') tableContainer!: ElementRef<HTMLDivElement>;

  student$!: Observable<any[]>;

  protected override get gameConfig(): VoiceGameConfig {
    return { ...super.gameConfig, enablePlayback: false };
  }

  constructor(
    @Inject(VEX_THEMES) public readonly themes: any[],
    private renderer: Renderer2
  ) {
    super();
  }

  vocabulary = this.shuffleArray(vocabulary);
  currentIndex = 0;
  phases = ['english', 'pronunciation', 'translation', 'association'];
  currentPhase = this.phases[0];
  score = 0;

  errorIndices: Set<number> = new Set<number>();
  correctEnglish: boolean[] = [];
  correctPronunciation: boolean[] = [];

  override ngOnInit(): void {
    super.ngOnInit();
  }

  ngAfterViewInit(): void {
    this.voiceService.setupWaveSurfer(this.micElement);
    this.addClickEventToCells();
  }

  protected override onGameInit(): void {
    this.correctEnglish = new Array(this.vocabulary.length).fill(false);
    this.correctPronunciation = new Array(this.vocabulary.length).fill(false);

    if (this.currentPhase === 'english') {
      const currentWord = this.vocabulary[this.currentIndex].english;
      this.voiceService.speak(currentWord);
    }
  }

  protected handleVoiceCommand(command: string): void {
    const currentWord = this.vocabulary[this.currentIndex].english;
    if (command.trim().toLowerCase() === currentWord.toLowerCase() && !this.correctEnglish[this.currentIndex]) {
      this.correctEnglish[this.currentIndex] = true;
      this.playSuccessSound();
      this.markRowAsCorrect(this.currentIndex);
      this.score++;
      this.incrementSatoshi();
      this.next();
    } else {
      this.playErrorSound();
      this.markError(this.currentIndex);
      this.score--;
      this.next();
    }
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
      this.currentIndex = 0;
    }
    this.currentPhase = this.phases[0];
    const currentWord = this.vocabulary[this.currentIndex].english;
    this.voiceService.speak(currentWord);
    this.scrollToCurrentElement();
  }

  scrollToCurrentElement(): void {
    setTimeout(() => {
      const currentElement = document.querySelector(`tr:nth-child(${this.currentIndex + 2})`);
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

  addClickEventToCells(): void {
    const cells = document.querySelectorAll('td');
    cells.forEach(cell => {
      this.renderer.listen(cell, 'click', () => {
        this.score--;
        this.playErrorSound();
        this.markError(this.currentIndex);
        this.next();
      });
      this.renderer.setStyle(cell, 'cursor', 'pointer');
    });
  }

  markRowAsCorrect(index: number): void {
    const row = document.querySelector(`tr:nth-child(${index + 2})`);
    if (row) {
      row.classList.add('correct');
      const heartIcon = document.createElement('i');
      heartIcon.className = 'fa-solid fa-heart';
      row.appendChild(heartIcon);
    }
  }
}
