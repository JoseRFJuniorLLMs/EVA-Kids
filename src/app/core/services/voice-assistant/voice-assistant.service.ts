/**
 * Voice Assistant Service - EVA (Educador Virtual Amigo)
 *
 * Usa browser SpeechSynthesis e SpeechRecognition como fallback
 * ate que @google/genai esteja disponivel.
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

// Estados do assistente
export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error' | 'connecting';

// Evento de audio
export interface AudioEvent {
  type: 'input' | 'output';
  data: Float32Array;
  averageLevel: number;
}

// Configuracao do assistente
export interface AssistantConfig {
  voiceName?: string;
  languageCode?: string;
  systemPrompt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceAssistantService implements OnDestroy {

  // Estado atual do assistente
  private _state = new BehaviorSubject<AssistantState>('idle');
  state$ = this._state.asObservable();

  // Status/mensagem atual
  private _status = new BehaviorSubject<string>('Ola! Sou seu amigo EVA!');
  status$ = this._status.asObservable();

  // Eventos de audio para visualizacao
  audioEvent$ = new Subject<AudioEvent>();

  // Erro
  private _error = new BehaviorSubject<string | null>(null);
  error$ = this._error.asObservable();

  // Transcricao
  private _transcript = new BehaviorSubject<string>('');
  transcript$ = this._transcript.asObservable();

  // Speech Recognition
  private recognition: any = null;
  private isRecording = false;
  private isSessionActive = false;

  // Voices disponiveis
  private voices: SpeechSynthesisVoice[] = [];

  // Configuracao padrao para criancas
  private config: AssistantConfig = {
    voiceName: 'Google Brasil',
    languageCode: 'pt-BR',
    systemPrompt: ''
  };

  constructor() {
    this.loadVoices();
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
    this.initSpeechRecognition();
  }

  private loadVoices(): void {
    if (typeof speechSynthesis !== 'undefined') {
      this.voices = speechSynthesis.getVoices();
    }
  }

  private getVoice(lang: string): SpeechSynthesisVoice | null {
    const voice = this.voices.find(v =>
      v.lang.startsWith(lang.substring(0, 2)) ||
      v.lang === lang
    );
    return voice || this.voices[0] || null;
  }

  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not available');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.languageCode || 'pt-BR';

    this.recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      this._transcript.next(transcript);

      if (event.results[event.resultIndex].isFinal) {
        this.handleUserSpeech(transcript);
      }
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      if (this._state.value === 'listening') {
        this._state.next('idle');
        this._status.next('Clique no microfone para falar!');
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this._error.next(event.error);
      this._state.next('error');
    };
  }

  private async handleUserSpeech(text: string): Promise<void> {
    this._state.next('thinking');
    this._status.next('Deixa eu pensar...');

    // Resposta simples do EVA (pode ser expandido com IA real depois)
    const response = this.generateSimpleResponse(text);

    // Falar resposta
    await this.speak(response);
  }

  private generateSimpleResponse(input: string): string {
    const lowerInput = input.toLowerCase();

    // Respostas basicas
    if (lowerInput.includes('ola') || lowerInput.includes('oi')) {
      return 'Ola amiguinho! Que bom falar com voce! Como posso te ajudar?';
    }
    if (lowerInput.includes('como vai') || lowerInput.includes('tudo bem')) {
      return 'Estou otimo! Sempre pronto para te ajudar a aprender coisas novas!';
    }
    if (lowerInput.includes('obrigado') || lowerInput.includes('valeu')) {
      return 'De nada! Estou sempre aqui para te ajudar!';
    }
    if (lowerInput.includes('tchau') || lowerInput.includes('adeus')) {
      return 'Tchau amiguinho! Volte sempre para aprender mais!';
    }

    // Traducoes basicas
    if (lowerInput.includes('como fala') && lowerInput.includes('ingles')) {
      const wordMatch = lowerInput.match(/como fala (.+) em ingles/);
      if (wordMatch) {
        const word = wordMatch[1].trim();
        const translations: { [key: string]: string } = {
          'cachorro': 'DOG',
          'gato': 'CAT',
          'casa': 'HOUSE',
          'escola': 'SCHOOL',
          'livro': 'BOOK',
          'agua': 'WATER',
          'comida': 'FOOD',
          'amigo': 'FRIEND',
          'amor': 'LOVE',
          'sol': 'SUN',
          'lua': 'MOON',
          'estrela': 'STAR',
          'flor': 'FLOWER',
          'arvore': 'TREE'
        };
        const translation = translations[word];
        if (translation) {
          return `${word} em ingles e ${translation}! Vamos falar juntos? ${translation}! Muito bem!`;
        }
      }
    }

    // Resposta padrao
    return 'Que legal! Continue praticando que voce vai aprender muito!';
  }

  /**
   * Inicializa a sessao
   */
  async initSession(): Promise<boolean> {
    this.isSessionActive = true;
    this._state.next('idle');
    this._status.next('EVA esta pronto para te ajudar!');
    return true;
  }

  /**
   * Inicia a escuta de audio
   */
  async startListening(): Promise<void> {
    if (this.isRecording || !this.recognition) return;

    try {
      this._state.next('listening');
      this._status.next('Estou te ouvindo... Pode falar!');
      this.isRecording = true;
      this.recognition.start();
    } catch (error) {
      console.error('Erro ao iniciar gravacao:', error);
      this._state.next('error');
      this._status.next('Nao consegui acessar o microfone...');
      this._error.next(`Erro de microfone: ${error}`);
    }
  }

  /**
   * Para a escuta de audio
   */
  stopListening(): void {
    if (!this.isRecording || !this.recognition) return;

    this.isRecording = false;
    this.recognition.stop();
    this._state.next('idle');
    this._status.next('Clique no microfone para falar!');
  }

  /**
   * Toggle entre ouvir e parar
   */
  toggleListening(): void {
    if (this.isRecording) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  /**
   * Reseta a sessao
   */
  resetSession(): void {
    this.stopListening();
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
    this._state.next('idle');
    this._status.next('EVA reiniciado! Pronto para te ajudar!');
    this._transcript.next('');
    this._error.next(null);
  }

  /**
   * Envia mensagem de texto para o assistente
   */
  async sendTextMessage(text: string): Promise<void> {
    this._state.next('thinking');
    this._status.next('Deixa eu pensar...');
    this._transcript.next(text);

    const response = this.generateSimpleResponse(text);
    await this.speak(response);
  }

  /**
   * Fala texto usando browser SpeechSynthesis
   */
  async speak(text: string): Promise<void> {
    if (!text.trim()) return;

    return new Promise((resolve, reject) => {
      if (typeof speechSynthesis === 'undefined') {
        reject(new Error('SpeechSynthesis not available'));
        return;
      }

      speechSynthesis.cancel();
      this._state.next('speaking');
      this._status.next('EVA esta falando...');

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.config.languageCode || 'pt-BR';
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;

      const voice = this.getVoice(utterance.lang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        this._state.next('idle');
        this._status.next('Sua vez de falar!');
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('SpeechSynthesis error:', event);
        this._state.next('error');
        reject(event);
      };

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Atualiza configuracao do assistente
   */
  updateConfig(config: Partial<AssistantConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.recognition) {
      this.recognition.lang = this.config.languageCode || 'pt-BR';
    }
  }

  /**
   * Obtem o estado atual
   */
  getState(): AssistantState {
    return this._state.value;
  }

  ngOnDestroy(): void {
    this.stopListening();
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
  }
}
