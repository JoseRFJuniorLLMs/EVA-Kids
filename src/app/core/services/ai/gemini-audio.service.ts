/**
 * Audio Service - TTS para EVA-Kids
 *
 * Usa Browser SpeechSynthesis para TTS simples (pronuncia de palavras).
 * Para conversacao bidirecional de voz, usar EVAWebSocketService.
 *
 * Nenhuma API key necessaria - tudo roda no navegador.
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export type AudioServiceState = 'idle' | 'connecting' | 'ready' | 'speaking' | 'listening' | 'error';

export interface GeminiAudioEvent {
  type: 'input' | 'output';
  data: Float32Array;
  averageLevel: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiAudioService implements OnDestroy {

  private _state = new BehaviorSubject<AudioServiceState>('idle');
  state$ = this._state.asObservable();

  audioEvent$ = new Subject<GeminiAudioEvent>();

  private _error = new BehaviorSubject<string | null>(null);
  error$ = this._error.asObservable();

  // TTS
  private speechSynthesis: SpeechSynthesis;
  private isSpeaking = false;
  private speechQueue: Array<{ text: string; onEnd?: () => void }> = [];
  private currentOnEnd: (() => void) | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  // Session state (public for component access)
  isSessionActive = false;

  constructor() {
    this.speechSynthesis = window.speechSynthesis;
    this.loadVoices();
    this._state.next('ready');
  }

  private loadVoices(): void {
    const load = () => {
      const voices = this.speechSynthesis.getVoices();
      // Prefer English female voice for kids
      this.selectedVoice = voices.find(v =>
        v.lang.startsWith('en') && /female|woman|girl/i.test(v.name)
      ) || voices.find(v => v.lang.startsWith('en-US'))
        || voices.find(v => v.lang.startsWith('en'))
        || null;
    };

    if (this.speechSynthesis.onvoiceschanged !== undefined) {
      this.speechSynthesis.onvoiceschanged = load;
    }
    setTimeout(load, 100);
  }

  /**
   * Fala texto usando Browser SpeechSynthesis
   */
  async speak(text: string, onEnd?: () => void): Promise<void> {
    if (!text.trim()) return;

    this.speechQueue.push({ text, onEnd });

    if (!this.isSpeaking) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.speechQueue.length === 0 || this.isSpeaking) return;

    const item = this.speechQueue.shift()!;
    this.currentOnEnd = item.onEnd || null;
    this.isSpeaking = true;
    this._state.next('speaking');

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      utterance.pitch = 1.1;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      this.audioEvent$.next({
        type: 'output',
        data: new Float32Array([0.7]),
        averageLevel: 0.7
      });

      utterance.onend = () => {
        this.finishSpeaking();
        resolve();
      };

      utterance.onerror = () => {
        this.finishSpeaking();
        resolve();
      };

      this.speechSynthesis.speak(utterance);
    });
  }

  private finishSpeaking(): void {
    this.isSpeaking = false;
    this._state.next('ready');

    this.audioEvent$.next({
      type: 'output',
      data: new Float32Array([0]),
      averageLevel: 0
    });

    if (this.currentOnEnd) {
      this.currentOnEnd();
      this.currentOnEnd = null;
    }

    this.processQueue();
  }

  async connect(systemPrompt?: string): Promise<boolean> {
    this.isSessionActive = true;
    this._state.next('ready');
    return true;
  }

  async startListening(): Promise<void> {
    this._state.next('listening');
  }

  stopListening(): void {
    this._state.next('ready');
  }

  stopPlayback(): void {
    this.speechSynthesis.cancel();
    this.isSpeaking = false;
    this.speechQueue = [];
    this.currentOnEnd = null;
    this._state.next('ready');
  }

  disconnect(): void {
    this.stopPlayback();
    this.isSessionActive = false;
    this._state.next('idle');
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
