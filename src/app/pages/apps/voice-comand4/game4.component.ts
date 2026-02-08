import { Component, ElementRef, OnInit, ViewChild, NgZone, AfterViewInit, OnDestroy, Inject, ChangeDetectorRef, Renderer2 } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import WaveSurfer from 'wavesurfer.js';
import words from '../../../../assets/json/word.json';
import { SoundService } from 'src/app/layouts/components/footer/sound.service';
import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';
import { VEX_THEMES } from '@vex/config/config.token';
import { VexConfigService } from '@vex/config/vex-config.service';
import {
  VexColorScheme,
  VexConfig,
  VexConfigName,
  VexThemeProvider
} from '@vex/config/vex-config.interface';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import screenfull from 'screenfull';
import { MatChipsModule } from '@angular/material/chips';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { SatoshiService } from '../note/satoshi.service';

@Component({
  selector: 'app-game4',
  templateUrl: './game4-component.html',
  styleUrls: ['./game4-component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatBadgeModule, MatChipsModule
  ]
})
export class Game4Component implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private playbackWavesurfer: WaveSurfer | null = null;

  @ViewChild('mic') micElement!: ElementRef<HTMLDivElement>;
  @ViewChild('waveformPlay') waveformPlay!: ElementRef;

  fragment: string = '';
  completeWord: string = '';
  message: string = '';
  commandCounter: number = 0;
  private revealIndex: number = 2;

  private wordPairs: { fragment: string, completeWord: string }[] = [];

  configs: VexConfig[] = this.configService.configs;
  config$: Observable<VexConfig> = this.configService.config$;

  collapsedOpen$ = this.layoutService.sidenavCollapsedOpen$;

  totalSatoshis = 0;
  showSatoshiAlert = false;
  private studentId = 'student-id'; 

  constructor(
    private renderer: Renderer2,
    private readonly configService: VexConfigService,
    private layoutService: VexLayoutService,
    @Inject(VEX_THEMES) public readonly themes: VexThemeProvider[],
    private voiceService: UnifiedVoiceService,
    private soundService: SoundService,
    private zone: NgZone,
    private _snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef,
    private satoshiService: SatoshiService
  ) {
    this.loadWords();
  }

  colorScheme$: Observable<VexColorScheme> = this.config$.pipe(
    map((config) => config.style.colorScheme)
  );
  ColorSchemeName = VexColorScheme;
  
  ngOnInit(): void {
    this.voiceService.usePreset('game');
    this.changeBackgroundImage();

    this.voiceService.command$.pipe(takeUntil(this.destroy$)).subscribe(command => {
      this.zone.run(() => this.checkAnswer(command));
    });

    this.voiceService.recordingEnded$.pipe(takeUntil(this.destroy$)).subscribe(url => {
      this.createWaveSurferPlay(url);
    });

    this.updateSatoshiBalance();
  }

  ngAfterViewInit(): void {
    this.changeBackgroundImage();

    this.voiceService.setupWaveSurfer(this.micElement);

    setTimeout(() => {
      this.layoutService.collapseSidenav();
      this.changeDetectorRef.detectChanges();
    });

    this.startGame();
    this.startRecording();
    this.enableDarkMode();

    const mockEvent = { checked: false } as MatSlideToggleChange;
    this.footerVisibleChange(mockEvent);

    if (screenfull.isEnabled) {
      screenfull.request().catch(err => {
        console.error('Screenfull request failed', err);
      });
    }

    this.message = 'Listening...';
    this.changeDetectorRef.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.playbackWavesurfer) {
      this.playbackWavesurfer.destroy();
    }

    this.voiceService.stopListening();
    this.voiceService.stopRecording();

    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }

    const mockEvent = { checked: true } as MatSlideToggleChange;
    this.footerVisibleChange(mockEvent);
  }

  loadWords(): void {
    this.wordPairs = words.map((item: any) => {
      return {
        fragment: this.createFragment(item.prime, 2),
        completeWord: item.prime
      };
    });
    this.selectRandomWord();
  }

  createFragment(word: string, revealLength: number): string {
    return word.substring(0, revealLength) + '*'.repeat(word.length - revealLength);
  }

  selectRandomWord(): void {
    const randomIndex = Math.floor(Math.random() * this.wordPairs.length);
    this.fragment = this.wordPairs[randomIndex].fragment;
    this.completeWord = this.wordPairs[randomIndex].completeWord;
    this.revealIndex = 2; 
  }

  startGame(): void {
    this.voiceService.startListening();
    this.message = 'Listening...';
    this.changeDetectorRef.detectChanges();
  }

  stopGame(): void {
    this.voiceService.stopListening();
    this.message = '';
  }

  seeMusic(): void{
    this.soundService.playEnd();
  }

  checkAnswer(answer: string): void {
    if (answer.trim().toLowerCase() === this.completeWord.toLowerCase()) {
      this.message = 'Correct!';
      this.commandCounter++;
      this.voiceService.speak(this.completeWord);
      this.openSnackBar('Correct!', 'Close');
      this.selectRandomWord();  
      this.soundService.playDone();
      this.incrementSatoshi(); // Increment Satoshi on correct answer
    } else {
      this.message = 'Try again!';
      this.openSnackBar('Try again!', 'Close');
      this.revealMoreCharacters();
      this.soundService.playErro();
    }
  }

  revealMoreCharacters(): void {
    if (this.revealIndex < this.completeWord.length) {
      this.revealIndex++;
      this.fragment = this.createFragment(this.completeWord, this.revealIndex);
    }
  }

  openSnackBar(message: string, action: string): void {
    this._snackBar.open(message, action, {
      duration: 2000,
    });
  }

  startRecording(): void {
    this.voiceService.startRecording();
  }

  createWaveSurferPlay(url: string): void {
    if (!this.waveformPlay || !this.waveformPlay.nativeElement) {
      return;
    }

    if (this.playbackWavesurfer) {
      this.playbackWavesurfer.destroy();
    }

    this.playbackWavesurfer = WaveSurfer.create({
      container: this.waveformPlay.nativeElement,
      waveColor: 'black',
      progressColor: 'gray',
      barWidth: 2,
      cursorWidth: 1,
      height: 60,
      barGap: 3,
      backend: 'WebAudio',
    });

    this.playbackWavesurfer.load(url);
  }

  nextWord(): void {
    this.selectRandomWord();
    this.message = '';
    this.changeBackgroundImage();
  }

  enableDarkMode(): void {
    this.configService.updateConfig({
      style: {
        colorScheme: VexColorScheme.DARK
        
      }
    });
  }

  footerVisibleChange(change: MatSlideToggleChange): void {
    this.configService.updateConfig({
      footer: {
        visible: change.checked
      }
    });
  }

  changeBackgroundImage(): void {
    const images = [
      'url("../../../../assets/img/game/frag.png")',
      'url("../../../../assets/img/game/frag2.png")',
      'url("../../../../assets/img/game/frag3.png")',
      'url("../../../../assets/img/game/frag4.png")',
      'url("../../../../assets/img/game/frag5.png")',
      'url("../../../../assets/img/game/frag6.png")',
      'url("../../../../assets/img/game/frag7.png")',
      'url("../../../../assets/img/game/frag8.png")',
      'url("../../../../assets/img/game/frag9.png")',
      'url("../../../../assets/img/game/frag10.png")',
      'url("../../../../assets/img/game/frag11.png")'
    ];
    const randomImage = images[Math.floor(Math.random() * images.length)];
    this.renderer.setStyle(document.querySelector('.game-container'), 'background-image', randomImage);
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
      error => console.error('Error incrementing satoshi balance:', error)
    );
  }
}
