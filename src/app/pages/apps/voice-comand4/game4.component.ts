import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, Renderer2, Inject, ChangeDetectorRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import words from '../../../../assets/json/word.json';
import { VEX_THEMES } from '@vex/config/config.token';
import { VexConfigService } from '@vex/config/vex-config.service';
import { VexColorScheme, VexConfig, VexThemeProvider } from '@vex/config/vex-config.interface';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { BaseVoiceGame } from '../voice-game/base-voice-game';

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
    MatBadgeModule,
    MatChipsModule
  ]
})
export class Game4Component extends BaseVoiceGame implements OnInit, AfterViewInit {
  @ViewChild('waveformPlay') override waveformPlay!: ElementRef;

  fragment: string = '';
  completeWord: string = '';
  private revealIndex: number = 2;
  private wordPairs: { fragment: string, completeWord: string }[] = [];

  configs: VexConfig[] = this.configService.configs;
  config$: Observable<VexConfig> = this.configService.config$;
  collapsedOpen$ = this.layoutService.sidenavCollapsedOpen$;

  colorScheme$: Observable<VexColorScheme> = this.config$.pipe(
    map((config) => config.style.colorScheme)
  );
  ColorSchemeName = VexColorScheme;

  constructor(
    private renderer: Renderer2,
    private readonly configService: VexConfigService,
    private layoutService: VexLayoutService,
    @Inject(VEX_THEMES) public readonly themes: VexThemeProvider[],
    private _snackBar: MatSnackBar
  ) {
    super();
    this.loadWords();
  }

  override ngOnInit(): void {
    super.ngOnInit();
  }

  ngAfterViewInit(): void {
    this.changeBackgroundImage();
    this.setupWaveSurferAndStart();

    setTimeout(() => {
      this.layoutService.collapseSidenav();
      this.cdr.detectChanges();
    });

    this.enableDarkMode();

    const mockEvent = { checked: false } as MatSlideToggleChange;
    this.footerVisibleChange(mockEvent);

    this.message = 'Listening...';
    this.cdr.detectChanges();
  }

  protected override onGameInit(): void {
    this.changeBackgroundImage();
  }

  protected override onGameDestroy(): void {
    const mockEvent = { checked: true } as MatSlideToggleChange;
    this.footerVisibleChange(mockEvent);
  }

  protected handleVoiceCommand(command: string): void {
    this.checkAnswer(command);
  }

  loadWords(): void {
    this.wordPairs = words.map((item: any) => ({
      fragment: this.createFragment(item.prime, 2),
      completeWord: item.prime
    }));
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

  checkAnswer(answer: string): void {
    if (answer.trim().toLowerCase() === this.completeWord.toLowerCase()) {
      this.message = 'Correct!';
      this.commandCounter++;
      this.voiceService.speak(this.completeWord);
      this.openSnackBar('Correct!', 'Close');
      this.selectRandomWord();
      this.playSuccessSound();
      this.incrementSatoshi();
    } else {
      this.message = 'Try again!';
      this.openSnackBar('Try again!', 'Close');
      this.revealMoreCharacters();
      this.playErrorSound();
    }
  }

  revealMoreCharacters(): void {
    if (this.revealIndex < this.completeWord.length) {
      this.revealIndex++;
      this.fragment = this.createFragment(this.completeWord, this.revealIndex);
    }
  }

  openSnackBar(message: string, action: string): void {
    this._snackBar.open(message, action, { duration: 2000 });
  }

  nextWord(): void {
    this.selectRandomWord();
    this.message = '';
    this.changeBackgroundImage();
  }

  seeMusic(): void {
    this.soundService.playEnd();
  }

  enableDarkMode(): void {
    this.configService.updateConfig({
      style: { colorScheme: VexColorScheme.DARK }
    });
  }

  footerVisibleChange(change: MatSlideToggleChange): void {
    this.configService.updateConfig({
      footer: { visible: change.checked }
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
}
