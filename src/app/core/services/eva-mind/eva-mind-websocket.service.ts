/**
 * EVA WebSocket Service - Conexao bidirecional de voz com EVA
 *
 * Conecta ao EVA via /ws/browser para conversacao de voz em tempo real.
 * EVA gerencia Gemini Live API no servidor - nenhuma API key no frontend.
 *
 * Protocolo EVA /ws/browser:
 *   Browser -> EVA: {type:"config", text:"<system_prompt>", data:"<cpf>"}
 *   Browser -> EVA: {type:"audio", data:"<base64 PCM 16kHz>"}
 *   Browser -> EVA: {type:"text", text:"<mensagem>"}
 *   EVA -> Browser: {type:"audio", data:"<base64 PCM 24kHz>"}
 *   EVA -> Browser: {type:"text", text:"<transcricao>"}
 *   EVA -> Browser: {type:"status", text:"ready|turn_complete|error|reconnecting"}
 *   EVA -> Browser: {type:"tool_event", tool:"<name>", status:"executing|success|error"}
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

export type EVAState = 'idle' | 'connecting' | 'registered' | 'active' | 'speaking' | 'error';

export interface EVAToolEvent {
  tool: string;
  status: 'executing' | 'success' | 'error';
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class EVAMindWebSocketService implements OnDestroy {

  private _state = new BehaviorSubject<EVAState>('idle');
  state$ = this._state.asObservable();

  private _transcript = new BehaviorSubject<string>('');
  transcript$ = this._transcript.asObservable();

  private _aiResponse = new BehaviorSubject<string>('');
  aiResponse$ = this._aiResponse.asObservable();

  private _error = new BehaviorSubject<string | null>(null);
  error$ = this._error.asObservable();

  private _audioLevel = new BehaviorSubject<number>(0);
  audioLevel$ = this._audioLevel.asObservable();

  private _toolEvent = new Subject<EVAToolEvent>();
  toolEvent$ = this._toolEvent.asObservable();

  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;
  private nextStartTime = 0;
  private cpf = '';
  private sessionId = '';
  private audioLevelInterval: any = null;
  private analyserNode: AnalyserNode | null = null;

  get currentState(): EVAState {
    return this._state.value;
  }

  async connect(cpf: string): Promise<void> {
    if (this._state.value !== 'idle' && this._state.value !== 'error') {
      return;
    }

    this.cpf = cpf;
    this._state.next('connecting');
    this._error.next(null);

    try {
      await this.initAudio();
      this.connectWebSocket();
    } catch (e: any) {
      this._state.next('error');
      this._error.next(e.message || 'Erro ao conectar');
      this.cleanup();
    }
  }

  startCall(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (this._state.value !== 'registered') return;

    this.sessionId = `kids-${Date.now()}`;
    this._state.next('active');
  }

  hangup(): void {
    this.cleanup();
    this._state.next('idle');
    this._transcript.next('');
    this._aiResponse.next('');
  }

  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'text', text }));
  }

  private async initAudio(): Promise<void> {
    const sampleRate = environment.eva?.sampleRate || 24000;

    this.audioContext = new AudioContext({ sampleRate });

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: { ideal: sampleRate },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });

    await this.audioContext.audioWorklet.addModule('assets/audio/pcm-processor.js');
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');

    this.audioWorkletNode.port.onmessage = (event: MessageEvent) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this._state.value === 'active') {
        // EVA /ws/browser expects base64 audio in JSON
        const pcmData = event.data as ArrayBuffer;
        const base64 = this.arrayBufferToBase64(pcmData);
        this.ws.send(JSON.stringify({ type: 'audio', data: base64 }));
      }
    };

    this.sourceNode.connect(this.audioWorkletNode);
    this.audioWorkletNode.connect(this.audioContext.destination);

    // Analyser for audio level visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.sourceNode.connect(this.analyserNode);
    this.startAudioLevelMonitoring();
  }

  private startAudioLevelMonitoring(): void {
    if (!this.analyserNode) return;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    this.audioLevelInterval = setInterval(() => {
      if (!this.analyserNode) return;
      this.analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length / 255;
      this._audioLevel.next(avg);
    }, 50);
  }

  private connectWebSocket(): void {
    const wsUrl = environment.eva?.wsUrl || 'wss://eva-ia.org:8091/ws/browser';

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      // Send config message with CPF and kids system prompt
      const configMsg = {
        type: 'config',
        text: 'Voce e a EVA Kids, assistente virtual amigavel para criancas aprendendo ingles. Fale de forma clara, alegre e educativa. Responda sempre de forma simples e divertida.',
        data: this.cpf
      };
      this.ws!.send(JSON.stringify(configMsg));

      this._state.next('registered');

      // Auto-start call after config
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.startCall();
        }
      }, 500);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        this.handleJsonMessage(event.data);
      } else {
        // Binary audio data (legacy support)
        this.handleAudioData(event.data as ArrayBuffer);
      }
    };

    this.ws.onerror = () => {
      this._state.next('error');
      this._error.next('Erro na conexao WebSocket com EVA');
    };

    this.ws.onclose = () => {
      if (this._state.value !== 'idle' && this._state.value !== 'error') {
        this._state.next('idle');
      }
    };
  }

  private handleJsonMessage(data: string): void {
    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case 'audio':
          // EVA sends base64 PCM audio
          if (msg.data) {
            this.playBase64Audio(msg.data);
          }
          break;

        case 'text':
          if (msg.data === 'user') {
            // User transcription
            this._transcript.next(msg.text || '');
          } else {
            // AI response transcription
            this._aiResponse.next(msg.text || '');
          }
          break;

        case 'status':
          this.handleStatus(msg.text);
          break;

        case 'tool_event':
          this._toolEvent.next({
            tool: msg.tool,
            status: msg.status,
            data: msg.tool_data
          });
          break;

        case 'error':
          this._error.next(msg.text || msg.error || 'Erro desconhecido');
          break;

        default:
          // Handle legacy message formats
          this.handleLegacyMessage(msg);
          break;
      }
    } catch {
      // Non-JSON message, ignore
    }
  }

  private handleStatus(status: string): void {
    switch (status) {
      case 'ready':
        if (this._state.value === 'speaking') {
          this._state.next('active');
        }
        break;
      case 'turn_complete':
        this._state.next('active');
        break;
      case 'interrupted':
        this._state.next('active');
        break;
      case 'reconnecting':
        this._state.next('connecting');
        break;
      case 'error':
        this._state.next('error');
        break;
    }
  }

  private handleLegacyMessage(msg: any): void {
    // Support old EVA-Mind message formats
    if (msg.serverContent) {
      if (msg.serverContent.inputAudioTranscription?.text) {
        this._transcript.next(msg.serverContent.inputAudioTranscription.text);
      }
      if (msg.serverContent.audioTranscription?.text) {
        this._aiResponse.next(msg.serverContent.audioTranscription.text);
      }
    }
    if (msg.type === 'inputAudioTranscription' && msg.payload) {
      this._transcript.next(msg.payload);
    }
    if (msg.type === 'audioTranscription' && msg.payload) {
      this._aiResponse.next(msg.payload);
    }
    if (msg.type === 'audio_start') {
      this._state.next('speaking');
    }
    if (msg.type === 'audio_end') {
      this._state.next('active');
    }
  }

  private playBase64Audio(base64: string): void {
    if (!this.audioContext) return;

    this._state.next('speaking');

    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to Float32
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, this.audioContext.sampleRate);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      const currentTime = this.audioContext.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      source.onended = () => {
        if (this.audioContext && this.audioContext.currentTime >= this.nextStartTime - 0.05) {
          if (this._state.value === 'speaking') {
            this._state.next('active');
          }
        }
      };
    } catch {
      // Audio playback error, continue
    }
  }

  private handleAudioData(arrayBuffer: ArrayBuffer): void {
    if (!this.audioContext) return;

    this._state.next('speaking');

    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, this.audioContext.sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;

    source.onended = () => {
      if (this.audioContext && this.audioContext.currentTime >= this.nextStartTime - 0.05) {
        if (this._state.value === 'speaking') {
          this._state.next('active');
        }
      }
    };
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private cleanup(): void {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }

    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.nextStartTime = 0;
    this._audioLevel.next(0);
  }

  ngOnDestroy(): void {
    this.hangup();
  }
}
