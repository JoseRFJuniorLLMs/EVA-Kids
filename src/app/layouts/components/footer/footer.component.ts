import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterOutlet } from '@angular/router';
import { scaleInOutAnimation } from '@vex/animations/scale-in-out.animation';

import { RsvpreaderComponent } from 'src/app/pages/dashboards/components/dialog-rsvpreader/rsvpreader.component';
import { ShareBottomZettelComponent } from 'src/app/pages/dashboards/components/share-bottom-zettel/share-bottom-zettel.component';
import { ShareBottomGpt4Component } from 'src/app/pages/dashboards/components/share-bottom-gpt4/share-bottom-gpt4.component';
import { ShareBottomWimHofComponent } from 'src/app/pages/dashboards/components/share-bottom-wim-hof/share-bottom-wim-hof.component';
import { ShareBottomSheetComponent } from 'src/app/pages/dashboards/components/share-bottom-sheet/share-bottom-sheet.component';

import { HttpClientModule } from '@angular/common/http';
import { SoundService } from './sound.service';
import { ShareBottomGameComponent } from 'src/app/pages/dashboards/components/share-bottom-game/share-bottom-game.component';
import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';
import { ShareBottomBooks3Component } from 'src/app/pages/dashboards/components/share-bottom-books3/share-bottom-books3.component';
import { AioTableComponent } from 'src/app/pages/apps/student/list/aio-table.component';
import { GeminiAudioService } from 'src/app/core/services/ai/gemini-audio.service';

@Component({
  selector: 'vex-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [scaleInOutAnimation],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    RouterLink,
    RouterOutlet,
    MatChipsModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    ShareBottomWimHofComponent,
    ShareBottomSheetComponent,
    MatBottomSheetModule,
    ShareBottomGpt4Component,
    ShareBottomZettelComponent,
    RsvpreaderComponent,
    HttpClientModule,
    MatSliderModule,
    FormsModule,
    CommonModule
  ]
})
export class FooterComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mic') micElement!: ElementRef<HTMLDivElement>;
  
  @Output() openConfig = new EventEmitter();
  @Output() openBottomConfig = new EventEmitter();
  showButton: boolean = false;
  result?: string;
  audioPlayer: HTMLAudioElement | null = null;
  displayTime: string = '30:00';
  displayTimeMin: string = '30';
  timer: any;
  durationInSeconds: number = 1800;
  selected: string | null = null;
  icon1: string = 'some-icon1';
  icon2: string = 'some-icon2';
  icon3: string = 'some-icon3';
  icon60fps: string = 'mat:60fps';
  icon30fps: string = 'mat:30fps';
  iconmilitarytech: string = 'mat:military_tech';
  paused: boolean = false;
  remainingSeconds: number = 0;
  progress: number = 0;
  isPlaying = false;

  // Unicornio IA
  isUnicornSpeaking = false;
  unicornGreetings = [
    'Ola amiguinho! Eu sou o Sparkle, seu unicornio magico! Vamos aprender juntos?',
    'Oi! Que bom te ver! Estou aqui para te ajudar a aprender coisas incriveis!',
    'Bem-vindo de volta! Vamos fazer magica com as palavras hoje?',
    'Ola! Eu adoro quando voce vem estudar comigo! Vamos comecar?',
    'Oi amiguinho! Hoje vamos descobrir coisas muito legais juntos!'
  ];

  constructor(
    private soundService: SoundService,
    private cdr: ChangeDetectorRef,
    private _bottomSheet: MatBottomSheet,
    private voiceService: UnifiedVoiceService,
    private geminiAudio: GeminiAudioService
  ) {}

  changeIcons(): void {
    this.icon60fps = 'mat:60fps_select';
    this.icon30fps = 'mat:30fps_select';
    this.iconmilitarytech = 'mat:military_tech';
  }

  ngOnInit(): void {
    this.startTimer();
    // UnifiedVoiceService initializes automatically - configure for footer use
    this.voiceService.usePreset('simple');
  }

  ngAfterViewInit(): void {
    // Footer compacto - sem waveform
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  playBiNeural() {
    this.soundService.playBiNeural();
    this.isPlaying = !this.isPlaying;
  }

  stopBiNeural() {
    if (this.audioPlayer && !this.audioPlayer.paused) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0; // Volta para o início do áudio
      this.isPlaying = false;
    }
  }

  onToggleChange(selection: string) {
    if (selection === 'get-vex3') {
      // Modo exclusivo - Deseleciona os outros
      if (this.selected !== 'get-vex3') {
        this.selected = 'get-vex3';
      } else {
        this.selected = null;
      }
    } else {
      // Se outro botão for selecionado, limpe 'get-vex3'
      this.selected = selection;

      // Se o botão 'get-vex1' ou 'get-vex2' for selecionado, resete o relógio
      if (selection === 'get-vex1' || selection === 'get-vex2') {
        this.stopTimer(); // Pare o timer atual
        if (selection === 'get-vex1') {
          this.durationInSeconds = 30 * 60; // Defina a duração para 30 minutos
        } else {
          this.durationInSeconds = 60 * 60; // Defina a duração para 60 minutos
        }
        this.startTimer(); // Inicie o novo timer
      }
    }
  }

  startTimer(): void {
    if (this.paused) {
      // Se estiver pausado, continue de onde parou
      this.timer = setInterval(() => {
        const hours = Math.floor(this.remainingSeconds / 3600); // Calcula as horas restantes
        const minutes = Math.floor((this.remainingSeconds % 3600) / 60); // Calcula os minutos restantes
        const seconds = this.remainingSeconds % 60; // Calcula os segundos restantes

        // Formata a exibição da hora, minuto e segundo
        this.displayTime = `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        this.displayTimeMin = `${hours * 60 + minutes}`; // Atualiza displayTimeMin com os minutos totais
        this.cdr.detectChanges();

        if (this.remainingSeconds === 0) {
          this.stopTimer();
          this.endTime(); // Dispara a função quando o tempo acaba
        } else {
          this.remainingSeconds--;
        }
      }, 1000);
    } else {
      // Se não estiver pausado, inicie um novo timer
      this.stopTimer(); // Certifique-se de parar o temporizador antes de iniciar um novo
      this.remainingSeconds = this.durationInSeconds; // Altere esta linha

      this.timer = setInterval(() => {
        const minutes = Math.floor(this.remainingSeconds / 60);
        const seconds = this.remainingSeconds % 60;
        this.displayTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        this.displayTimeMin = `${minutes}`;
        this.cdr.detectChanges();
        if (this.remainingSeconds === 0) {
          this.stopTimer();
          this.endTime(); // Dispara a função quando o tempo acaba
        } else {
          this.remainingSeconds--;
        }
      }, 1000);
    }
  }

  endTime(): void {
    this.openBothConfigsWimHof();
  }

  stopTimer(): void {
    this.soundService.playOpen();
    clearInterval(this.timer);
  }

  pauseTimer(): void {
    this.soundService.playOpen();
    clearInterval(this.timer);
    this.paused = true;
  }

  continueTimer(): void {
    this.soundService.playOpen();
    if (!this.paused) return;
    this.startTimer();
    this.paused = false;
  }

  stopProgressBar(): void {
    this.soundService.playOpen();
    clearInterval(this.timer);
    this.paused = true;
    this.progress = 0;
  }

  openBothConfigsBook() {
    //boooks
    this.soundService.playToc();
    this._bottomSheet.open(ShareBottomGpt4Component);
  }

  openBothConfigsBook2() {
    //boooks
    this.soundService.playToc();
    this._bottomSheet.open(ShareBottomBooks3Component);
  }

  openBothConfigsCam() {
    //Cam
    this.soundService.playToc();
    this._bottomSheet.open(AioTableComponent);
  }

  openBothConfigsWimHof() {
    //wim hof
    this.soundService.playToc();
    this._bottomSheet.open(ShareBottomWimHofComponent);
  }

  openBothConfigsZettelkasten() {
    //Zette
    this.soundService.playToc();
    this._bottomSheet.open(ShareBottomZettelComponent);
  }

  openBothConfigsGame() {
    //Zette
    this.soundService.playToc();
    this._bottomSheet.open(ShareBottomGameComponent);
  }

  initializeWaveSurfer() {
    this.voiceService.setupWaveSurfer(this.micElement);
  }

  // === UNICORNIO IA - Fala usando Gemini ===
  async activateUnicorn(): Promise<void> {
    if (this.isUnicornSpeaking) return;

    this.isUnicornSpeaking = true;
    this.soundService.playToc();
    this.cdr.detectChanges();

    // Escolhe uma saudacao aleatoria
    const greeting = this.unicornGreetings[Math.floor(Math.random() * this.unicornGreetings.length)];

    // Usa apenas Gemini Audio para falar
    await this.geminiAudio.speak(greeting, () => {
      this.isUnicornSpeaking = false;
      this.cdr.detectChanges();
    });
  }
}
