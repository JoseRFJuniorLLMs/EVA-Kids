import { Injectable, NgZone, ElementRef, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.js';

import {
  VoiceServiceConfig,
  VoiceServiceState,
  VoiceServiceError,
  VoiceRecognitionConfig,
  WaveSurferConfig,
  RecordingConfig,
  TTSConfig,
  VOICE_PRESETS,
  DEFAULT_VOICE_CONFIG
} from './voice.models';

/**
 * UnifiedVoiceService - Single voice service for all Priming application needs
 *
 * Replaces all 12 voice recognition services:
 * - VoiceRecognitionService (voice-comand/)
 * - Voice2RecognitionService (voice-comand2/)
 * - Voice3RecognitionService (voice-comand3/)
 * - Voice4RecognitionService (voice-comand4/)
 * - Voice5RecognitionService (voice-comand5/)
 * - Voice6RecognitionService (memory/)
 * - Voice7RecognitionService (dino/)
 * - Voice8RecognitionService (word-search/)
 * - VoiceCardRecognitionService (note/list/)
 * - VoiceCabRecognitionService (quebra/)
 * - VoiceFoodRecognitionService (footer/)
 * - SpeechRecognitionService (services/)
 *
 * Features:
 * - Configurable speech recognition
 * - WaveSurfer audio visualization
 * - Audio recording
 * - Text-to-speech synthesis
 * - Multiple presets for different use cases
 */
@Injectable({
  providedIn: 'root'
})
export class UnifiedVoiceService implements OnDestroy {
  // Configuration
  private config: VoiceServiceConfig = DEFAULT_VOICE_CONFIG;

  // Speech Recognition
  private recognition: SpeechRecognition | null = null;
  private isListeningInternal = false;

  // WaveSurfer
  public wavesurfer: WaveSurfer | null = null;
  public recordPlugin: any = null;

  // State
  private isRecordingInternal = false;
  private isPausedInternal = false;
  public recordedUrl: string | undefined;

  // Speech Synthesis
  private speechSynthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;

  // Observables for external consumption
  public readonly command$ = new Subject<string>();
  public readonly interimResult$ = new Subject<string>();
  public readonly recordingEnded$ = new Subject<string>();
  public readonly spokenText$ = new Subject<string>();
  public readonly error$ = new Subject<VoiceServiceError>();

  // State observable
  private stateSubject = new BehaviorSubject<VoiceServiceState>('idle');
  public readonly state$ = this.stateSubject.asObservable();

  // Public state getters
  public get isListening(): boolean {
    return this.isListeningInternal;
  }

  public get isRecording(): boolean {
    return this.isRecordingInternal;
  }

  public get isPaused(): boolean {
    return this.isPausedInternal;
  }

  constructor(private zone: NgZone) {
    this.speechSynthesis = window.speechSynthesis;
    this.loadVoices();
    this.initRecognition();
  }

  // ==================== CONFIGURATION ====================

  /**
   * Configure the service with custom settings
   */
  configure(config: Partial<VoiceServiceConfig>): void {
    this.config = {
      recognition: { ...this.config.recognition, ...(config.recognition || {}) },
      wavesurfer: { ...this.config.wavesurfer, ...(config.wavesurfer || {}) },
      recording: { ...this.config.recording, ...(config.recording || {}) },
      tts: { ...this.config.tts, ...(config.tts || {}) }
    };

    // Reinitialize recognition with new config
    this.initRecognition();
  }

  /**
   * Apply a preset configuration
   */
  usePreset(preset: keyof typeof VOICE_PRESETS | string): void {
    const presetConfig = VOICE_PRESETS[preset];
    if (presetConfig) {
      this.configure(presetConfig);
    } else {
      // Unknown preset - ignoring
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): VoiceServiceConfig {
    return { ...this.config };
  }

  // ==================== SPEECH RECOGNITION ====================

  /**
   * Initialize the speech recognition engine
   */
  private initRecognition(): void {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition ||
                                  (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      this.handleError('SPEECH_RECOGNITION_NOT_SUPPORTED', 'Speech Recognition API not supported in this browser.');
      return;
    }

    // Stop existing recognition if any
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }

    const recognition = new SpeechRecognitionAPI() as SpeechRecognition;
    this.recognition = recognition;
    const recConfig = this.config.recognition;

    recognition.continuous = recConfig.continuous;
    recognition.interimResults = recConfig.interimResults;
    recognition.lang = recConfig.language;
    recognition.maxAlternatives = recConfig.maxAlternatives;

    recognition.onstart = () => {
      this.zone.run(() => {
        this.isListeningInternal = true;
        this.stateSubject.next('listening');
      });
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.zone.run(() => {
        const lastResult = event.results[event.results.length - 1];

        if (lastResult.isFinal) {
          const command = lastResult[0].transcript.trim().toLowerCase();
          this.command$.next(command);
          this.spokenText$.next(command);
        } else if (this.config.recognition.interimResults) {
          const interim = lastResult[0].transcript.trim();
          this.interimResult$.next(interim);
        }
      });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.zone.run(() => {
        this.handleError('SPEECH_RECOGNITION_ERROR', event.error);
      });
    };

    recognition.onend = () => {
      this.zone.run(() => {
        if (this.isListeningInternal && this.config.recognition.autoRestart) {
          // Auto-restart if still listening
          try {
            this.recognition?.start();
          } catch (e) {
            // Ignore restart errors
          }
        } else {
          this.isListeningInternal = false;
          this.stateSubject.next('idle');
        }
      });
    };
  }

  /**
   * Start listening for voice commands
   */
  startListening(): void {
    if (!this.recognition) {
      this.handleError('RECOGNITION_NOT_INITIALIZED', 'Speech recognition not initialized');
      return;
    }

    if (!this.isListeningInternal) {
      try {
        this.recognition.start();
      } catch (e) {
        // May throw if already started
        // Recognition may already be started
      }
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening(): void {
    if (this.recognition && this.isListeningInternal) {
      this.isListeningInternal = false;
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors
      }
      this.stateSubject.next('idle');
    }
  }

  // ==================== WAVESURFER & RECORDING ====================

  /**
   * Setup WaveSurfer for audio visualization and recording
   */
  setupWaveSurfer(container: ElementRef<HTMLDivElement>): void {
    if (!this.config.wavesurfer?.enabled) {
      return;
    }

    // Destroy existing instance
    if (this.wavesurfer) {
      try {
        this.wavesurfer.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
    }

    if (!container?.nativeElement) {
      this.handleError('WAVESURFER_CONTAINER_ERROR', 'WaveSurfer container not available');
      return;
    }

    const wsConfig = this.config.wavesurfer;

    try {
      this.wavesurfer = WaveSurfer.create({
        container: container.nativeElement,
        waveColor: wsConfig.waveColor,
        progressColor: wsConfig.progressColor,
        barGap: wsConfig.barGap,
        barWidth: wsConfig.barWidth,
        barHeight: wsConfig.barHeight,
        barRadius: wsConfig.barRadius,
        backend: 'WebAudio'
      });

      // Setup recording plugin if enabled
      if (this.config.recording?.enabled) {
        const recConfig = this.config.recording;

        this.recordPlugin = this.wavesurfer.registerPlugin(
          RecordPlugin.create({
            mimeType: recConfig.mimeType,
            scrollingWaveform: recConfig.scrollingWaveform,
            renderRecordedAudio: recConfig.renderRecordedAudio
          })
        );

        this.recordPlugin.on('record-end', (blob: Blob) => {
          this.zone.run(() => {
            this.isRecordingInternal = false;
            this.recordedUrl = URL.createObjectURL(blob);
            this.recordingEnded$.next(this.recordedUrl);
            this.stateSubject.next('idle');
          });
        });
      }
    } catch (error) {
      this.handleError('WAVESURFER_INIT_ERROR', error);
    }
  }

  /**
   * Start audio recording
   */
  startRecording(): void {
    if (!this.recordPlugin) {
      this.handleError('RECORDING_NOT_AVAILABLE', 'Recording plugin not initialized');
      return;
    }

    if (!this.recordPlugin.isRecording?.()) {
      try {
        this.recordPlugin.startRecording();
        this.isRecordingInternal = true;
        this.stateSubject.next('recording');
      } catch (e) {
        this.handleError('RECORDING_START_ERROR', e);
      }
    } else {
      // Recording is already in progress
    }
  }

  /**
   * Stop audio recording
   */
  stopRecording(): void {
    if (this.recordPlugin?.isRecording?.()) {
      try {
        this.recordPlugin.stopRecording();
        this.isRecordingInternal = false;
      } catch (e) {
        this.handleError('RECORDING_STOP_ERROR', e);
      }
    } else {
      // No recording in progress to stop
    }
  }

  /**
   * Pause/Resume audio recording
   */
  pauseRecording(): void {
    if (!this.recordPlugin || !this.isRecordingInternal) {
      // No recording in progress to pause/resume
      return;
    }

    try {
      if (!this.isPausedInternal) {
        this.recordPlugin.pauseRecording();
        this.isPausedInternal = true;
      } else {
        this.recordPlugin.resumeRecording();
        this.isPausedInternal = false;
      }
    } catch (e) {
      this.handleError('RECORDING_PAUSE_ERROR', e);
    }
  }

  /**
   * Toggle recording state
   */
  toggleRecording(): void {
    if (this.isRecordingInternal) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  /**
   * Load audio into WaveSurfer for playback
   */
  loadAudio(url: string): void {
    if (this.wavesurfer) {
      this.wavesurfer.load(url);
    }
  }

  /**
   * Play loaded audio
   */
  playAudio(): void {
    this.wavesurfer?.play();
  }

  /**
   * Pause audio playback
   */
  pauseAudio(): void {
    this.wavesurfer?.pause();
  }

  // ==================== TEXT-TO-SPEECH ====================

  /**
   * Load available voices
   */
  private loadVoices(): void {
    const loadVoicesInternal = () => {
      this.voices = this.speechSynthesis.getVoices();

      // Select a default English female voice for children
      this.selectedVoice = this.voices.find(v =>
        v.lang.startsWith('en') && /female|woman|girl/i.test(v.name)
      ) || this.voices.find(v => v.lang.startsWith('en')) || null;
    };

    if ('onvoiceschanged' in this.speechSynthesis) {
      this.speechSynthesis.onvoiceschanged = loadVoicesInternal;
    }

    setTimeout(loadVoicesInternal, 100);
  }

  /**
   * Speak text using browser TTS
   */
  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.tts.enabled) {
        resolve();
        return;
      }

      this.speechSynthesis.cancel();
      this.stateSubject.next('speaking');

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.config.tts.language;
      utterance.rate = this.config.tts.rate;
      utterance.pitch = this.config.tts.pitch;
      utterance.volume = this.config.tts.volume;

      // Select voice
      if (this.config.tts.voice) {
        const voice = this.voices.find(v =>
          v.name.toLowerCase().includes(this.config.tts.voice!.toLowerCase())
        );
        if (voice) utterance.voice = voice;
      } else if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.onend = () => {
        this.stateSubject.next('idle');
        resolve();
      };

      utterance.onerror = (event) => {
        this.stateSubject.next('idle');
        reject(event);
      };

      this.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Speak text with word boundary callback for highlighting
   */
  speakWithHighlighting(
    text: string,
    onWordBoundary: (charIndex: number, charLength: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.tts.enabled) {
        resolve();
        return;
      }

      this.speechSynthesis.cancel();
      this.stateSubject.next('speaking');

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.config.tts.language;
      utterance.rate = this.config.tts.rate;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          onWordBoundary(event.charIndex, event.charLength || 1);
        }
      };

      utterance.onend = () => {
        this.stateSubject.next('idle');
        resolve();
      };

      utterance.onerror = (event) => {
        this.stateSubject.next('idle');
        reject(event);
      };

      this.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Speak selected/highlighted text
   */
  speakSelectedText(text: string): void {
    this.speak(text);
  }

  /**
   * Speak text while visualizing with WaveSurfer
   * Used by flashcard component for visual feedback during speech
   */
  speakAndVisualize(
    text: string,
    container: ElementRef<HTMLDivElement>,
    voice: SpeechSynthesisVoice | null
  ): void {
    const utterance = new SpeechSynthesisUtterance(text);

    if (voice) {
      utterance.voice = voice;
    } else if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.lang = this.config.tts.language;
    utterance.rate = this.config.tts.rate;

    utterance.onstart = () => {
      this.stateSubject.next('speaking');
      this.setupWaveSurfer(container);
      this.startRecording();
    };

    utterance.onend = () => {
      this.stopRecording();
      this.stateSubject.next('idle');
    };

    this.speechSynthesis.speak(utterance);
  }

  /**
   * Stop current speech
   */
  stopSpeaking(): void {
    this.speechSynthesis.cancel();
    this.stateSubject.next('idle');
  }

  /**
   * Pause current speech
   */
  pauseSpeaking(): void {
    this.speechSynthesis.pause();
  }

  /**
   * Resume paused speech
   */
  resumeSpeaking(): void {
    this.speechSynthesis.resume();
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  /**
   * Set preferred voice by name
   */
  setVoice(voiceName: string): void {
    this.selectedVoice = this.voices.find(v =>
      v.name.toLowerCase().includes(voiceName.toLowerCase())
    ) || null;

    this.config.tts.voice = voiceName;
  }

  /**
   * Set speech rate
   */
  setSpeechRate(rate: number): void {
    this.config.tts.rate = Math.max(0.5, Math.min(2.0, rate));
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get current service state
   */
  getState(): VoiceServiceState {
    return this.stateSubject.value;
  }

  /**
   * Check if speech recognition is supported
   */
  isRecognitionSupported(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Check if speech synthesis is supported
   */
  isSynthesisSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Handle errors
   */
  private handleError(code: string, details: unknown): void {
    const message = details instanceof Error ? details.message : String(details);
    this.stateSubject.next('error');
    this.error$.next({ code, message, details });
    console.error(`[UnifiedVoiceService] ${code}:`, details);
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    this.destroy();
  }

  /**
   * Manual cleanup
   */
  destroy(): void {
    // Stop recognition
    if (this.recognition) {
      this.isListeningInternal = false;
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
    }

    // Stop speech synthesis
    this.speechSynthesis?.cancel();

    // Destroy WaveSurfer
    if (this.wavesurfer) {
      try {
        this.wavesurfer.destroy();
      } catch (e) {
        // Ignore
      }
    }

    // Complete subjects
    this.command$.complete();
    this.interimResult$.complete();
    this.recordingEnded$.complete();
    this.spokenText$.complete();
    this.error$.complete();
    this.stateSubject.complete();
  }
}
