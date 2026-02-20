import { Directive, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import WaveSurfer from 'wavesurfer.js';
import screenfull from 'screenfull';
import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';
import { SoundService } from 'src/app/layouts/components/footer/sound.service';
import { SatoshiService } from '../note/satoshi.service';
import { AuthService } from '../../pages/auth/login/auth.service';
import { VoiceGameConfig, DEFAULT_VOICE_GAME_CONFIG } from './voice-game.models';

@Directive()
export abstract class BaseVoiceGame implements OnInit, OnDestroy {
  protected destroy$ = new Subject<void>();
  protected playbackWavesurfer: WaveSurfer | null = null;

  @ViewChild('mic') micElement!: ElementRef<HTMLDivElement>;
  @ViewChild('waveformPlay') waveformPlay!: ElementRef;

  totalSatoshis = 0;
  showSatoshiAlert = false;
  commandCounter = 0;
  message = '';

  protected zone = inject(NgZone);
  protected voiceService = inject(UnifiedVoiceService);
  protected soundService = inject(SoundService);
  protected satoshiService = inject(SatoshiService);
  protected authService = inject(AuthService);
  protected cdr = inject(ChangeDetectorRef);

  protected get gameConfig(): VoiceGameConfig {
    return DEFAULT_VOICE_GAME_CONFIG;
  }

  ngOnInit(): void {
    const config = this.gameConfig;

    this.voiceService.usePreset(config.voicePreset || 'game');

    if (config.fullscreenOnInit && screenfull.isEnabled) {
      screenfull.request().catch(() => {});
    }

    this.voiceService.command$.pipe(takeUntil(this.destroy$)).subscribe(command => {
      this.zone.run(() => this.handleVoiceCommand(command));
    });

    if (config.enablePlayback) {
      this.voiceService.recordingEnded$.pipe(takeUntil(this.destroy$)).subscribe(url => {
        this.createWaveSurferPlay(url);
      });
    }

    if (config.enableSatoshi) {
      this.updateSatoshiBalance();
    }

    this.onGameInit();
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

    this.onGameDestroy();
  }

  protected abstract handleVoiceCommand(command: string): void;

  /** Hook for subclass-specific init logic. Called after base ngOnInit. */
  protected onGameInit(): void {}

  /** Hook for subclass-specific destroy logic. Called at end of base ngOnDestroy. */
  protected onGameDestroy(): void {}

  protected setupWaveSurferAndStart(): void {
    this.voiceService.setupWaveSurfer(this.micElement);
    this.voiceService.startListening();
    this.voiceService.startRecording();
  }

  protected createWaveSurferPlay(url: string): void {
    if (!this.waveformPlay?.nativeElement) return;

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
      backend: 'WebAudio'
    });

    this.playbackWavesurfer.load(url);
  }

  private getStudentId(): string | null {
    const configId = this.gameConfig.studentId;
    if (configId) return configId;
    const uid = this.authService.getUID();
    return uid ? uid.toString() : null;
  }

  protected updateSatoshiBalance(): void {
    const studentId = this.getStudentId();
    if (!studentId) return;
    this.satoshiService.getSatoshiBalance(studentId).pipe(takeUntil(this.destroy$)).subscribe(
      (balance: number) => {
        this.totalSatoshis = balance;
        this.cdr.detectChanges();
      }
    );
  }

  protected incrementSatoshi(): void {
    const studentId = this.getStudentId();
    if (!studentId) return;
    this.satoshiService.incrementSatoshi(studentId, 1).pipe(takeUntil(this.destroy$)).subscribe(
      (newBalance: number) => {
        this.totalSatoshis = newBalance;
        this.showSatoshiAlert = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.showSatoshiAlert = false;
          this.cdr.detectChanges();
        }, 2000);
      }
    );
  }

  protected playSuccessSound(): void {
    this.soundService.playDone();
  }

  protected playErrorSound(): void {
    this.soundService.playErro();
  }

  protected cleanCommand(command: string): string {
    return command.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  protected speakText(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

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
}
