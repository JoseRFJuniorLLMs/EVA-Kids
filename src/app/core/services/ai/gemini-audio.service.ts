/**
 * Gemini Audio Service - Voz a Voz com Gemini 2.0
 *
 * Usa Gemini 2.0 Flash com saida de audio nativa.
 * NAO usa TTS externo - audio gerado diretamente pelo Gemini.
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

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

  // Gemini API Config
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private model = 'gemini-2.0-flash-exp'; // Modelo com suporte a audio nativo

  // Audio
  private audioContext: AudioContext | null = null;
  private isSpeaking = false;
  private speechQueue: Array<{ text: string; onEnd?: () => void }> = [];
  private currentOnEnd: (() => void) | null = null;

  // WebSocket para Live API
  private ws: WebSocket | null = null;
  private isConnected = false;

  // Session state (public for component access)
  isSessionActive = false;
  private systemPrompt = '';

  constructor(private http: HttpClient) {
    this.apiKey = this.getApiKey();
    this.initAudioContext();
  }

  private getApiKey(): string {
    return (environment as any).geminiApiKey ||
      (environment as any).ai?.gemini?.apiKey ||
      '';
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
    }
  }

  /**
   * Conecta ao Gemini Live API via WebSocket
   */
  async connect(systemPrompt?: string): Promise<boolean> {
    if (systemPrompt) {
      this.systemPrompt = systemPrompt;
    }
    if (this.isConnected) return true;
    this.isSessionActive = true;

    return new Promise((resolve) => {
      try {
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this._state.next('ready');

          // Envia configuracao inicial
          this.sendSetupMessage();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.ws.onerror = () => {
          this._state.next('error');
          resolve(false);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this._state.next('idle');
        };

      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Envia configuracao inicial para o Gemini
   */
  private sendSetupMessage(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupMessage = {
      setup: {
        model: `models/${this.model}`,
        generation_config: {
          response_modalities: ['AUDIO'], // Resposta em audio
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: 'Aoede' // Voz feminina amigavel
              }
            }
          }
        },
        system_instruction: {
          parts: [{
            text: this.systemPrompt || 'Voce e a EVA, uma assistente virtual amigavel para criancas aprendendo ingles. Fale de forma clara, alegre e educativa. Responda sempre em portugues de forma simples e divertida.'
          }]
        }
      }
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  /**
   * Processa mensagens recebidas do WebSocket
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      // Audio data recebido
      if (data.serverContent?.modelTurn?.parts) {
        for (const part of data.serverContent.modelTurn.parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/')) {
            this.playAudioFromBase64(part.inlineData.data);
          }
        }
      }

      // Fim da resposta
      if (data.serverContent?.turnComplete) {
        this.isSpeaking = false;
        this._state.next('ready');

        if (this.currentOnEnd) {
          this.currentOnEnd();
          this.currentOnEnd = null;
        }

        this.processQueue();
      }

    } catch (error) {
    }
  }

  /**
   * Fala texto usando Gemini (voz nativa)
   */
  async speak(text: string, onEnd?: () => void): Promise<void> {
    if (!text.trim()) return;

    // Adiciona na fila
    this.speechQueue.push({ text, onEnd });

    // Se nao esta falando, processa
    if (!this.isSpeaking) {
      await this.processQueue();
    }
  }

  /**
   * Processa fila de falas
   */
  private async processQueue(): Promise<void> {
    if (this.speechQueue.length === 0 || this.isSpeaking) return;

    const item = this.speechQueue.shift()!;
    this.currentOnEnd = item.onEnd || null;
    this.isSpeaking = true;
    this._state.next('speaking');

    // Conecta se necessario
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        // Fallback: usa REST API com audio
        await this.speakWithRestApi(item.text);
        return;
      }
    }

    // Envia texto para gerar audio
    this.sendTextMessage(item.text);
  }

  /**
   * Envia texto para o Gemini gerar audio
   */
  private sendTextMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.speakWithRestApi(text);
      return;
    }

    const message = {
      client_content: {
        turns: [{
          role: 'user',
          parts: [{ text }]
        }],
        turn_complete: true
      }
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Fallback: usa REST API do Gemini com audio
   */
  private async speakWithRestApi(text: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await firstValueFrom(this.http.post<any>(url, {
        contents: [{
          parts: [{ text: `Responda de forma amigavel e breve: ${text}` }]
        }],
        generationConfig: {
          response_modalities: ['AUDIO', 'TEXT'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: 'Aoede'
              }
            }
          }
        }
      }));

      // Procura audio na resposta
      if (response?.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/')) {
            await this.playAudioFromBase64(part.inlineData.data);
            return;
          }
        }
      }

      // Se nao tem audio, finaliza
      this.finishSpeaking();

    } catch (error) {
      this.finishSpeaking();
    }
  }

  /**
   * Reproduz audio base64
   */
  private async playAudioFromBase64(base64Audio: string): Promise<void> {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'audio/pcm' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.audioEvent$.next({
          type: 'output',
          data: new Float32Array([0]),
          averageLevel: 0
        });
      };

      this.audioEvent$.next({
        type: 'output',
        data: new Float32Array([0.7]),
        averageLevel: 0.7
      });

      await audio.play();

    } catch (error) {
    }
  }

  /**
   * Finaliza fala atual
   */
  private finishSpeaking(): void {
    this.isSpeaking = false;
    this._state.next('ready');

    if (this.currentOnEnd) {
      this.currentOnEnd();
      this.currentOnEnd = null;
    }

    this.processQueue();
  }

  /**
   * Inicia escuta de audio
   */
  async startListening(): Promise<void> {
    this._state.next('listening');
    // Conecta se necessario
    if (!this.isConnected) {
      await this.connect();
    }
  }

  /**
   * Para escuta de audio
   */
  stopListening(): void {
    this._state.next('ready');
  }

  /**
   * Para reproducao
   */
  stopPlayback(): void {
    this.isSpeaking = false;
    this.speechQueue = [];
    this.currentOnEnd = null;
    this._state.next('ready');
  }

  /**
   * Desconecta
   */
  disconnect(): void {
    this.stopPlayback();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isSessionActive = false;
    this._state.next('idle');
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.audioContext?.close();
  }
}
