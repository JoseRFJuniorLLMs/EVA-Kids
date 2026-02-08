import { Component, ElementRef, Inject, Input, OnInit, ViewChild, NgZone, ChangeDetectorRef, AfterViewInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
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
import { SoundService } from 'src/app/layouts/components/footer/sound.service';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';
import WaveSurfer from 'wavesurfer.js';
import screenfull from 'screenfull';
import { SatoshiService } from '../note/satoshi.service';

@Component({
  selector: 'game3-component',
  templateUrl: './game3-component.html',
  styleUrls: ['./game3-component.scss'],
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
export class Game3Component implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private playbackWavesurfer: WaveSurfer | null = null;
  student$!: Observable<any[]>;

  @ViewChild('mic') micElement!: ElementRef<HTMLDivElement>;
  @ViewChild('micSelect') micSelectElement!: ElementRef<HTMLSelectElement>;
  @ViewChild('waveformPlay') waveformPlay!: ElementRef;

  @Input() recordedUrl: string | undefined;

  isPanelExpanded: boolean = true;
  recognition: any;
  message: string = '';
  speak: string = '';
  commandCounter: number = 0;
  currentPhraseIndex: number = 0;

  combinations: Set<string> = new Set();
  totalCombinations: number;
  currentPage: number = 0;
  pageSize: number = 9;

  legendas: string[] = [];
  collapsed: any;
  layoutService: any;

  isDialogOpen: boolean = false;
  dialogRef: any = null;
  showFlashCard: boolean = false;

  whos = ['i', 'you', 'we', 'they', 'he', 'she', 'it', 'people', 'someone', 'everyone'];
  whys = ['can', 'want', 'like', 'need', 'loves', 'hates', 'prefers', 'enjoy', 'has to', 'should'];
  actions = ['go', 'see', 'eat', 'play', 'work', 'drive', 'stay', 'listen', 'study', 'visit'];
  wheres = ['to the store', 'the movie', 'at the restaurant', 'in the park', 'at the office', 'to the city', 'at home', 'to music', 'in the library', 'the museum'];

  allCombinations: { who: string, why: string, action: string, where: string }[] = [];
  currentCombinations: { who: string, why: string, action: string, where: string }[] = [];

  private flashcardDialogRef: any;
  private studentId = 'student-id';
  totalSatoshis = 0;
  showSatoshiAlert = false;

  constructor(
    private cdr: ChangeDetectorRef,
    public dialog: MatDialog,
    private elementRef: ElementRef,
    @Inject(Firestore) private firestore: Firestore,
    private zone: NgZone,
    private soundService: SoundService,
    private voiceService: UnifiedVoiceService,
    @Inject(SatoshiService) private satoshiService: SatoshiService
  ) {
    const student = collection(this.firestore, 'StudentCollection');
    this.student$ = collectionData(student) as Observable<any[]>;

    this.totalCombinations = this.whos.length * this.whys.length * this.actions.length * this.wheres.length;
    this.generateCombinations();
    this.updateCurrentCombinations();
  }

  ngOnInit(): void {
    if (screenfull.isEnabled) {
      screenfull.request();
    }

    this.voiceService.usePreset('game');

    this.voiceService.command$.pipe(takeUntil(this.destroy$)).subscribe(command => {
      this.zone.run(() => this.executeVoiceCommand(command));
    });

    this.voiceService.recordingEnded$.pipe(takeUntil(this.destroy$)).subscribe(url => {
      this.recordedUrl = url;
      this.createWaveSurferPlay(url);
    });

    this.startVoiceRecognition();
    this.updateSatoshiBalance();
  }

  ngAfterViewInit(): void {
    this.voiceService.setupWaveSurfer(this.micElement);
    this.startRecording();
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
  }

  updateSatoshiBalance() {
    this.satoshiService.getSatoshiBalance(this.studentId).pipe(takeUntil(this.destroy$)).subscribe(
      (balance: number) => {
        this.totalSatoshis = balance;
      },
      (error: any) => console.error('Error fetching satoshi balance:', error)
    );
  }

  generateCombinations(): void {
    for (const who of this.whos) {
      for (const why of this.whys) {
        for (const action of this.actions) {
          for (const where of this.wheres) {
            this.allCombinations.push({ who, why, action, where });
          }
        }
      }
    }
  }

  updateCurrentCombinations(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.currentCombinations = this.allCombinations.slice(start, end);
  }

  nextPage(): void {
    this.currentPage++;
    this.updateCurrentCombinations();
    this.currentPhraseIndex = 0;
  }

  updateHint(event: any): void {
    this.commandCounter = event.value;
    this.cdr.detectChanges();
  }

  startVoiceRecognition(): void {
    this.voiceService.startListening();
  }

  cleanCommand(command: string): string {
    return command.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  executeVoiceCommand(command: string): void {
    const cleanedCommand = this.cleanCommand(command);
    const parsedCommand = this.parseCommand(cleanedCommand);

    if (parsedCommand) {
      const commandKey = `${parsedCommand.who} ${parsedCommand.why} ${parsedCommand.action} ${parsedCommand.where}`;
      if (!this.combinations.has(commandKey)) {
        this.combinations.add(commandKey);
        this.commandCounter++;
        this.cdr.detectChanges();
        if (this.commandCounter === this.pageSize) {
          this.nextPage();
        }
      }

      if (this.currentPhraseIndex < this.currentCombinations.length - 1) {
        this.currentPhraseIndex++;
      } else {
        this.nextPage();
      }

      this.speak = `${parsedCommand.who} ${parsedCommand.why} ${parsedCommand.action} ${parsedCommand.where}`;
      this.soundService.playDone();
      this.incrementSatoshi(); 
    } else {
      this.message = `${cleanedCommand}`;
      this.soundService.playErro();
      this.speakText(`${cleanedCommand}`);
    }
  }

  parseCommand(command: string): { who: string, why: string, action: string, where: string } | null {
    const whoPattern = this.whos.join('|');
    const whyPattern = this.whys.join('|');
    const actionPattern = this.actions.join('|');
    const wherePattern = this.wheres.join('|');

    const regex = new RegExp(`(${whoPattern})\\s+(${whyPattern})\\s+(${actionPattern})\\s+(${wherePattern})`, 'i');
    const match = command.match(regex);

    if (match) {
      return {
        who: match[1],
        why: match[2],
        action: match[3],
        where: match[4]
      };
    }
    return null;
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

  playBiNeural(): void {
    this.soundService.playBiNeural();
  }

  toggleCollapse() {
    this.collapsed
      ? this.layoutService.expandSidenav()
      : this.layoutService.collapseSidenav();
  }

  speakText(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => voice.name === 'Google UK English Female');

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      } else {
        console.warn('Voz "Google UK English Female" não encontrada, usando a voz padrão.');
      }

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
      setVoice();
    }
  }

  private incrementSatoshi() {
    this.satoshiService.incrementSatoshi(this.studentId, 1).subscribe(
      (newBalance: number) => {
        this.totalSatoshis = newBalance;
        this.showSatoshiAlert = true;
        setTimeout(() => this.showSatoshiAlert = false, 2000);
      },
      (error: any) => console.error('Erro ao incrementar saldo de satoshi:', error)
    );
  }

}
