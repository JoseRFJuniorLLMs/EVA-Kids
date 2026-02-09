import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { VexConfigService } from '@vex/config/vex-config.service';
import qaData from '../../../../assets/json/qa-game.json';
import { BaseVoiceGame } from '../voice-game/base-voice-game';
import { VoiceGameConfig } from '../voice-game/voice-game.models';

@Component({
  selector: 'game2-component',
  templateUrl: './game2-component.html',
  styleUrls: ['./game2-component.scss'],
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
export class Game2Component extends BaseVoiceGame implements OnInit, AfterViewInit {
  @ViewChild('waveformPlay') override waveformPlay!: ElementRef;

  questions: string[] = qaData.map(item => item.question);
  answers: string[] = qaData.map(item => item.answer);

  currentQuestionIndex: number = 0;
  currentAnswer: string = '';
  currentQuestion: string = '';
  speak: string = '';

  protected override get gameConfig(): VoiceGameConfig {
    return { ...super.gameConfig, enableSatoshi: false };
  }

  constructor(
    private readonly configService: VexConfigService,
    private layoutService: VexLayoutService,
    private renderer: Renderer2
  ) {
    super();
  }

  override ngOnInit(): void {
    super.ngOnInit();
  }

  ngAfterViewInit(): void {
    this.setupWaveSurferAndStart();
    this.changeBackgroundImage();
  }

  protected override onGameInit(): void {
    this.askNextQuestion();

    setTimeout(() => {
      this.layoutService.collapseSidenav();
      this.cdr.detectChanges();
    });

    this.changeBackgroundImage();

    const mockEvent = { checked: false } as MatSlideToggleChange;
    this.footerVisibleChange(mockEvent);
  }

  protected override onGameDestroy(): void {
    const mockEvent = { checked: true } as MatSlideToggleChange;
    this.footerVisibleChange(mockEvent);
  }

  protected handleVoiceCommand(command: string): void {
    const cleanedCommand = this.cleanCommand(command);
    this.currentAnswer = this.answers[this.currentQuestionIndex];

    if (cleanedCommand === this.currentAnswer.toLowerCase()) {
      this.playSuccessSound();
      this.currentQuestionIndex++;
      this.commandCounter++;
      this.askNextQuestion();
    } else {
      this.playErrorSound();
      this.message = `The correct answer is: ${this.currentAnswer}`;
      this.speakText(this.message);
    }

    this.cdr.detectChanges();
  }

  askNextQuestion(): void {
    if (this.currentQuestionIndex < this.questions.length) {
      this.currentQuestion = this.questions[this.currentQuestionIndex];
      this.currentAnswer = this.answers[this.currentQuestionIndex];
      this.speakText(this.currentQuestion);
    }
  }

  skipToNextQuestion(): void {
    this.changeBackgroundImage();
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex < this.questions.length) {
      this.askNextQuestion();
    }
  }

  repeatQuestion(): void {
    this.speakText(this.currentQuestion);
  }

  repeatAnswer(): void {
    this.speakText(this.currentAnswer);
  }

  override speakText(text: string): void {
    const utterance = new SpeechSynthesisUtterance(this.cleanTextForSpeech(text));
    utterance.lang = 'en-GB';

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => voice.name === 'Google UK English Female');
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
      setVoice();
    }
  }

  private cleanTextForSpeech(text: string): string {
    return text.replace(/'/g, ' ').replace(/,/g, '');
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
      'url("../../../../assets/img/game/fraj.png")',
      'url("../../../../assets/img/game/fraj2.png")',
      'url("../../../../assets/img/game/fraj3.png")',
      'url("../../../../assets/img/game/fraj4.png")',
      'url("../../../../assets/img/game/fraj5.png")',
      'url("../../../../assets/img/game/fraj6.png")',
      'url("../../../../assets/img/game/fraj7.png")',
      'url("../../../../assets/img/game/fraj8.png")',
      'url("../../../../assets/img/game/fraj9.png")',
      'url("../../../../assets/img/game/fraj10.png")',
      'url("../../../../assets/img/game/fraj11.png")',
      'url("../../../../assets/img/game/fraj12.png")'
    ];

    const randomImage = images[Math.floor(Math.random() * images.length)];
    this.renderer.setStyle(document.querySelector('.game-container'), 'background-image', randomImage);
  }
}
