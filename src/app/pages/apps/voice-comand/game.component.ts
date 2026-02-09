import { Component, ElementRef, Input, OnInit, ViewChild, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
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
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import WaveSurfer from 'wavesurfer.js';
import { StudentService } from '../student/student.service';
import { FlashcardComponent } from '../note/list/flashcard.component';
import { NoteCollection } from '../note/note-collection';
import { BaseVoiceGame } from '../voice-game/base-voice-game';

@Component({
  selector: 'game-component',
  templateUrl: './game-component.html',
  styleUrls: ['./game-component.scss'],
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
    FormsModule,
    FlashcardComponent
  ]
})
export class GameComponent extends BaseVoiceGame implements OnInit, AfterViewInit {
  student$!: Observable<any[]>;

  @ViewChild('waveformPlay') override waveformPlay!: ElementRef;
  @Input() recordedUrl: string | undefined;

  maskedMode = false;
  isPanelExpanded: boolean = true;
  speak: string = '';
  currentPhraseIndex: number = 0;

  combinations: Set<string> = new Set();
  totalCombinations: number;
  currentPage: number = 0;
  pageSize: number = 9;

  legendas: string[] = [];

  whos = ['i', 'you', 'we', 'they', 'he', 'she', 'it', 'people', 'someone', 'everyone'];
  whys = ['can', 'want', 'like', 'need', 'loves', 'hates', 'prefers', 'enjoy', 'has to', 'should'];
  actions = ['go', 'see', 'eat', 'play', 'work', 'drive', 'stay', 'listen', 'study', 'visit'];
  wheres = ['to the store', 'the movie', 'at the restaurant', 'in the park', 'at the office', 'to the city', 'at home', 'to music', 'in the library', 'the museum'];

  allCombinations: { who: string, why: string, action: string, where: string }[] = [];
  currentCombinations: { who: string, why: string, action: string, where: string }[] = [];

  private flashcardDialogRef: any;
  filteredNotes$!: Observable<NoteCollection[]>;

  constructor(
    public dialog: MatDialog,
    private elementRef: ElementRef,
    private route: ActivatedRoute,
    private studentService: StudentService
  ) {
    super();
    this.student$ = this.studentService.getStudents();
    this.maskedMode = this.route.snapshot.data['maskedMode'] === true;
    this.totalCombinations = this.whos.length * this.whys.length * this.actions.length * this.wheres.length;
    this.generateCombinations();
    this.updateCurrentCombinations();
  }

  override ngOnInit(): void {
    super.ngOnInit();
  }

  ngAfterViewInit(): void {
    this.setupWaveSurferAndStart();
  }

  protected override onGameInit(): void {
    this.voiceService.recordingEnded$.pipe().subscribe(url => {
      this.recordedUrl = url;
    });
  }

  protected handleVoiceCommand(command: string): void {
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
      this.playSuccessSound();
      this.incrementSatoshi();
    } else {
      this.message = `${cleanedCommand}`;
      this.playErrorSound();
      this.speakText(`${cleanedCommand}`);
    }
  }

  override createWaveSurferPlay(url: string): void {
    if (this.playbackWavesurfer) {
      this.playbackWavesurfer.destroy();
    }

    this.playbackWavesurfer = WaveSurfer.create({
      container: this.waveformPlay.nativeElement,
      waveColor: '#6c63ff',
      progressColor: '#FE7F9C',
      barWidth: 4,
      cursorWidth: 1,
      height: 100,
      normalize: true
    });

    this.playbackWavesurfer.load(url);
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

  parseCommand(command: string): { who: string, why: string, action: string, where: string } | null {
    const whoPattern = this.whos.join('|');
    const whyPattern = this.whys.join('|');
    const actionPattern = this.actions.join('|');
    const wherePattern = this.wheres.join('|');

    const regex = new RegExp(`(${whoPattern})\\s+(${whyPattern})\\s+(${actionPattern})\\s+(${wherePattern})`);
    const match = command.match(regex);

    if (match) {
      return { who: match[1], why: match[2], action: match[3], where: match[4] };
    }

    return null;
  }

  playBiNeural(): void {
    this.soundService.playBiNeural();
  }
}
