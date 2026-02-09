/**
 * Voice Assistant Service - EVA (Educador Virtual Amigo)
 *
 * Delega para EVAMindWebSocketService para conexao real
 * com o backend EVA-Mind via WebSocket PCM16.
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { EVAMindWebSocketService } from '../eva-mind/eva-mind-websocket.service';
import { EVAMindState } from '../eva-mind/eva-mind.models';

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
  cpf?: string;
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

  // Transcricao do usuario
  private _transcript = new BehaviorSubject<string>('');
  transcript$ = this._transcript.asObservable();

  // Resposta da IA
  private _aiResponse = new BehaviorSubject<string>('');
  aiResponse$ = this._aiResponse.asObservable();

  private isActive = false;
  private cpf = '';
  private subscriptions = new Subscription();

  constructor(private evaMind: EVAMindWebSocketService) {
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    // Map EVA-Mind states to assistant states
    this.subscriptions.add(
      this.evaMind.state$.subscribe((state: EVAMindState) => {
        const mapped = this.mapState(state);
        this._state.next(mapped);
        this._status.next(this.getStatusMessage(mapped, state));
      })
    );

    this.subscriptions.add(
      this.evaMind.transcript$.subscribe(text => {
        if (text) this._transcript.next(text);
      })
    );

    this.subscriptions.add(
      this.evaMind.aiResponse$.subscribe(text => {
        if (text) this._aiResponse.next(text);
      })
    );

    this.subscriptions.add(
      this.evaMind.error$.subscribe(err => {
        this._error.next(err);
      })
    );

    // Feed audio level into audioEvent$ for visualizer
    this.subscriptions.add(
      this.evaMind.audioLevel$.subscribe(level => {
        if (level > 0) {
          const data = new Float32Array(1);
          data[0] = level;
          this.audioEvent$.next({ type: 'input', data, averageLevel: level });
        }
      })
    );
  }

  private mapState(evaMindState: EVAMindState): AssistantState {
    switch (evaMindState) {
      case 'idle': return 'idle';
      case 'connecting': return 'connecting';
      case 'registered': return 'connecting';
      case 'active': return 'listening';
      case 'speaking': return 'speaking';
      case 'error': return 'error';
      default: return 'idle';
    }
  }

  private getStatusMessage(state: AssistantState, evaMindState: EVAMindState): string {
    switch (state) {
      case 'idle': return 'Clique no microfone para falar!';
      case 'connecting':
        return evaMindState === 'registered' ? 'Conectado! Iniciando...' : 'Conectando ao EVA...';
      case 'listening': return 'Estou te ouvindo... Pode falar!';
      case 'speaking': return 'EVA esta falando...';
      case 'error': return 'Ops! Algo deu errado...';
      default: return 'Ola! Sou seu amigo EVA!';
    }
  }

  /**
   * Define o CPF para autenticacao
   */
  setCpf(cpf: string): void {
    this.cpf = cpf;
  }

  /**
   * Inicializa a sessao
   */
  async initSession(): Promise<boolean> {
    this._state.next('idle');
    this._status.next('EVA esta pronto para te ajudar!');
    return true;
  }

  /**
   * Inicia a escuta de audio via EVA-Mind WebSocket
   */
  async startListening(): Promise<void> {
    if (this.isActive) return;

    if (!this.cpf) {
      this._error.next('CPF nao configurado');
      this._state.next('error');
      this._status.next('Configure o CPF para continuar');
      return;
    }

    this.isActive = true;
    await this.evaMind.connect(this.cpf);
  }

  /**
   * Para a escuta de audio
   */
  stopListening(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.evaMind.hangup();
  }

  /**
   * Toggle entre ouvir e parar
   */
  toggleListening(): void {
    if (this.isActive) {
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
    this._state.next('idle');
    this._status.next('EVA reiniciado! Pronto para te ajudar!');
    this._transcript.next('');
    this._aiResponse.next('');
    this._error.next(null);
  }

  /**
   * Envia mensagem de texto (nao suportado via WebSocket PCM, mantido por compatibilidade)
   */
  async sendTextMessage(text: string): Promise<void> {
    this._transcript.next(text);
  }

  /**
   * Atualiza configuracao do assistente
   */
  updateConfig(config: Partial<AssistantConfig>): void {
    if (config.cpf) {
      this.cpf = config.cpf;
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
    this.subscriptions.unsubscribe();
  }
}
