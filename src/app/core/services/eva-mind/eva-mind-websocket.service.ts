import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EVAMindState, EVAMindMessage, EVA_MIND_AUDIO_CONFIG } from './eva-mind.models';

@Injectable({
  providedIn: 'root'
})
export class EVAMindWebSocketService implements OnDestroy {

  private _state = new BehaviorSubject<EVAMindState>('idle');
  state$ = this._state.asObservable();

  private _transcript = new BehaviorSubject<string>('');
  transcript$ = this._transcript.asObservable();

  private _aiResponse = new BehaviorSubject<string>('');
  aiResponse$ = this._aiResponse.asObservable();

  private _error = new BehaviorSubject<string | null>(null);
  error$ = this._error.asObservable();

  private _audioLevel = new BehaviorSubject<number>(0);
  audioLevel$ = this._audioLevel.asObservable();

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

  get currentState(): EVAMindState {
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
    const msg = { type: 'start_call', cpf: this.cpf, session_id: this.sessionId };
    this.ws.send(JSON.stringify(msg));
    this._state.next('active');
  }

  hangup(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = { type: 'hangup', cpf: this.cpf, session_id: this.sessionId };
      this.ws.send(JSON.stringify(msg));
    }
    this.cleanup();
    this._state.next('idle');
    this._transcript.next('');
    this._aiResponse.next('');
  }

  private async initAudio(): Promise<void> {
    const sampleRate = environment.evaMind?.sampleRate || EVA_MIND_AUDIO_CONFIG.sampleRate;

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
        this.ws.send(event.data);
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
    const wsUrl = environment.evaMind?.wsUrl || 'wss://eva-ia.org:8090/ws/pcm';

    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      // Register
      const registerMsg = { type: 'register', cpf: this.cpf };
      this.ws!.send(JSON.stringify(registerMsg));

      // Start call after brief delay for registration
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this._state.next('registered');
          this.startCall();
        }
      }, 500);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        this.handleJsonMessage(event.data);
      } else {
        this.handleAudioData(event.data as ArrayBuffer);
      }
    };

    this.ws.onerror = () => {
      this._state.next('error');
      this._error.next('Erro na conexao WebSocket');
    };

    this.ws.onclose = () => {
      if (this._state.value !== 'idle' && this._state.value !== 'error') {
        this._state.next('idle');
      }
    };
  }

  private handleJsonMessage(data: string): void {
    try {
      const msg: EVAMindMessage = JSON.parse(data);

      if (msg.type === 'error') {
        this._error.next(msg.error || 'Erro desconhecido');
        return;
      }

      // Handle transcriptions from serverContent
      if (msg.serverContent) {
        if (msg.serverContent.inputAudioTranscription?.text) {
          this._transcript.next(msg.serverContent.inputAudioTranscription.text);
        }
        if (msg.serverContent.audioTranscription?.text) {
          this._aiResponse.next(msg.serverContent.audioTranscription.text);
        }
      }

      // Handle direct transcription fields
      if (msg.type === 'inputAudioTranscription' && msg.payload) {
        this._transcript.next(msg.payload);
      }
      if (msg.type === 'audioTranscription' && msg.payload) {
        this._aiResponse.next(msg.payload);
      }

      // Speaking state management
      if (msg.type === 'audio_start') {
        this._state.next('speaking');
      }
      if (msg.type === 'audio_end') {
        this._state.next('active');
      }
    } catch {
      // Non-JSON message, ignore
    }
  }

  private handleAudioData(arrayBuffer: ArrayBuffer): void {
    if (!this.audioContext) return;

    this._state.next('speaking');

    // Convert PCM16 to Float32
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    // Create AudioBuffer and schedule playback
    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, this.audioContext.sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Gapless playback scheduling
    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;

    // Return to active state after playback finishes
    source.onended = () => {
      if (this.audioContext && this.audioContext.currentTime >= this.nextStartTime - 0.05) {
        if (this._state.value === 'speaking') {
          this._state.next('active');
        }
      }
    };
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
