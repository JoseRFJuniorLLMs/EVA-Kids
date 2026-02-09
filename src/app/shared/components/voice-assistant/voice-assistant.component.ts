/**
 * Voice Assistant Component - Componente Visual do Assistente de Voz
 *
 * Um botao flutuante e amigavel que permite que criancas
 * interajam com o assistente EVA em qualquer tela do sistema.
 * Conecta ao EVA-Mind via WebSocket para conversacao real.
 */

import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  Input,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import {
  VoiceAssistantService,
  AssistantState,
  AudioEvent
} from 'src/app/core/services/voice-assistant/voice-assistant.service';

@Component({
  selector: 'app-voice-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatTooltipModule, MatIconModule],
  template: `
    <div class="voice-assistant-container" [class.expanded]="isExpanded" [class.minimized]="!isExpanded">

      <!-- Botao Principal Flutuante -->
      <button
        class="assistant-fab"
        [class.listening]="state === 'listening'"
        [class.speaking]="state === 'speaking'"
        [class.thinking]="state === 'thinking'"
        [class.error]="state === 'error'"
        [class.connecting]="state === 'connecting'"
        (click)="toggleExpanded()"
        [matTooltip]="status">

        <!-- Circulos de Animacao -->
        <div class="pulse-ring pulse-1" *ngIf="state === 'listening' || state === 'speaking'"></div>
        <div class="pulse-ring pulse-2" *ngIf="state === 'listening' || state === 'speaking'"></div>
        <div class="pulse-ring pulse-3" *ngIf="state === 'listening'"></div>

        <!-- Mascote EVA -->
        <span class="assistant-emoji" [class.bounce]="state === 'speaking'">
          {{ getStateEmoji() }}
        </span>
      </button>

      <!-- Painel Expandido -->
      <div class="assistant-panel" *ngIf="isExpanded">

        <!-- Cabecalho -->
        <div class="panel-header">
          <span class="header-emoji">🦄</span>
          <span class="header-title">EVA</span>
          <span class="header-subtitle">Seu Amigo de Estudos</span>
          <button class="close-btn" (click)="toggleExpanded()">✕</button>
        </div>

        <!-- Visualizacao de Audio -->
        <div class="audio-visualizer">
          <canvas #visualizerCanvas></canvas>
          <div class="visualizer-overlay">
            <span class="state-emoji">{{ getStateEmoji() }}</span>
          </div>
        </div>

        <!-- Transcricoes -->
        <div class="transcript-area" *ngIf="userTranscript || aiResponse">
          <div class="transcript-user" *ngIf="userTranscript">
            <span class="transcript-label">Voce:</span>
            <span class="transcript-text">{{ userTranscript }}</span>
          </div>
          <div class="transcript-ai" *ngIf="aiResponse">
            <span class="transcript-label">EVA:</span>
            <span class="transcript-text">{{ aiResponse }}</span>
          </div>
        </div>

        <!-- Status -->
        <div class="status-area">
          <p class="status-text">{{ status }}</p>
        </div>

        <!-- CPF Input (quando nao ha CPF configurado) -->
        <div class="cpf-area" *ngIf="!hasCpf && state === 'idle'">
          <label class="cpf-label">Digite o CPF para conectar:</label>
          <div class="cpf-input-row">
            <input
              class="cpf-input"
              type="text"
              [(ngModel)]="cpfValue"
              placeholder="00000000000"
              maxlength="11"
              (keyup.enter)="saveCpf()">
            <button class="cpf-btn" (click)="saveCpf()" [disabled]="cpfValue.length !== 11">OK</button>
          </div>
        </div>

        <!-- Controles -->
        <div class="controls-area">
          <!-- Botao Principal de Voz -->
          <button
            class="voice-btn"
            [class.active]="state === 'listening'"
            (click)="toggleListening()"
            [disabled]="state === 'speaking' || state === 'connecting' || (!hasCpf && state === 'idle')">
            <span class="btn-emoji">{{ state === 'listening' ? '🛑' : '🎤' }}</span>
            <span class="btn-text">{{ getButtonText() }}</span>
          </button>

          <!-- Botao Reset -->
          <button
            class="reset-btn"
            (click)="resetSession()"
            [disabled]="state === 'connecting'">
            <span class="btn-emoji">🔄</span>
          </button>
        </div>

        <!-- Dica -->
        <div class="tip-area">
          <span class="tip-icon">💡</span>
          <span class="tip-text">{{ getCurrentTip() }}</span>
        </div>

      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');

    .voice-assistant-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      font-family: 'Nunito', sans-serif;
    }

    /* ============ BOTAO FLUTUANTE ============ */

    .assistant-fab {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #DA77F2, #F783AC);
      cursor: pointer;
      position: relative;
      box-shadow: 0 6px 25px rgba(218, 119, 242, 0.4);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: visible;
    }

    .assistant-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 8px 30px rgba(218, 119, 242, 0.5);
    }

    .assistant-fab.listening {
      background: linear-gradient(135deg, #69DB7C, #51CF66);
      box-shadow: 0 6px 25px rgba(105, 219, 124, 0.5);
    }

    .assistant-fab.speaking {
      background: linear-gradient(135deg, #4DABF7, #339AF0);
      box-shadow: 0 6px 25px rgba(77, 171, 247, 0.5);
    }

    .assistant-fab.thinking {
      background: linear-gradient(135deg, #FFE066, #FFA94D);
      box-shadow: 0 6px 25px rgba(255, 224, 102, 0.5);
    }

    .assistant-fab.connecting {
      background: linear-gradient(135deg, #FFE066, #FFA94D);
      box-shadow: 0 6px 25px rgba(255, 224, 102, 0.5);
      animation: connectPulse 1.5s ease infinite;
    }

    .assistant-fab.error {
      background: linear-gradient(135deg, #FF6B6B, #FA5252);
      box-shadow: 0 6px 25px rgba(255, 107, 107, 0.5);
    }

    .assistant-emoji {
      font-size: 2rem;
      z-index: 1;
    }

    .assistant-emoji.bounce {
      animation: bounce 0.5s ease infinite;
    }

    /* Aneis de pulso */
    .pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 3px solid currentColor;
      opacity: 0;
      animation: pulse 2s ease-out infinite;
    }

    .pulse-ring.pulse-1 {
      animation-delay: 0s;
      border-color: rgba(255, 255, 255, 0.6);
    }

    .pulse-ring.pulse-2 {
      animation-delay: 0.5s;
      border-color: rgba(255, 255, 255, 0.4);
    }

    .pulse-ring.pulse-3 {
      animation-delay: 1s;
      border-color: rgba(255, 255, 255, 0.2);
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      100% {
        transform: scale(2.5);
        opacity: 0;
      }
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    @keyframes connectPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    /* ============ PAINEL EXPANDIDO ============ */

    .minimized .assistant-panel {
      display: none;
    }

    .assistant-panel {
      position: absolute;
      bottom: 85px;
      right: 0;
      width: 320px;
      background: white;
      border-radius: 25px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Header */
    .panel-header {
      background: linear-gradient(135deg, #DA77F2, #F783AC);
      padding: 15px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: white;
      position: relative;
    }

    .header-emoji {
      font-size: 1.8rem;
    }

    .header-title {
      font-family: 'Fredoka One', cursive;
      font-size: 1.3rem;
    }

    .header-subtitle {
      font-size: 0.75rem;
      opacity: 0.9;
    }

    .close-btn {
      position: absolute;
      right: 15px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1rem;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* Audio Visualizer */
    .audio-visualizer {
      height: 150px;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .audio-visualizer canvas {
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
    }

    .visualizer-overlay {
      z-index: 1;
      text-align: center;
    }

    .state-emoji {
      font-size: 4rem;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }

    /* Transcript Area */
    .transcript-area {
      padding: 10px 15px;
      background: #f0f4ff;
      border-bottom: 1px solid #e0e4ea;
      max-height: 100px;
      overflow-y: auto;
    }

    .transcript-user, .transcript-ai {
      margin-bottom: 6px;
      font-size: 0.85rem;
      line-height: 1.3;
    }

    .transcript-user {
      color: #495057;
    }

    .transcript-ai {
      color: #7048e8;
    }

    .transcript-label {
      font-weight: 700;
      margin-right: 6px;
    }

    .transcript-text {
      font-weight: 400;
    }

    /* Status Area */
    .status-area {
      padding: 15px 20px;
      text-align: center;
      background: #f8f9fa;
      border-bottom: 1px dashed #eee;
    }

    .status-text {
      margin: 0;
      font-weight: 600;
      color: #333;
      font-size: 0.95rem;
    }

    /* CPF Area */
    .cpf-area {
      padding: 12px 20px;
      background: #fff3bf;
      text-align: center;
    }

    .cpf-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 8px;
    }

    .cpf-input-row {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .cpf-input {
      width: 140px;
      padding: 8px 12px;
      border: 2px solid #ffd43b;
      border-radius: 12px;
      font-size: 1rem;
      font-family: 'Nunito', sans-serif;
      text-align: center;
      letter-spacing: 1px;
      outline: none;
    }

    .cpf-input:focus {
      border-color: #DA77F2;
    }

    .cpf-btn {
      padding: 8px 16px;
      background: linear-gradient(135deg, #69DB7C, #51CF66);
      border: none;
      border-radius: 12px;
      color: white;
      font-weight: 700;
      font-family: 'Fredoka One', cursive;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .cpf-btn:hover:not(:disabled) {
      transform: scale(1.05);
    }

    .cpf-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Controls */
    .controls-area {
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
    }

    .voice-btn {
      background: linear-gradient(135deg, #69DB7C, #51CF66);
      border: none;
      border-radius: 50px;
      padding: 15px 30px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      color: white;
      font-family: 'Fredoka One', cursive;
      font-size: 1rem;
      box-shadow: 0 4px 15px rgba(105, 219, 124, 0.3);
      transition: all 0.3s ease;
    }

    .voice-btn:hover:not(:disabled) {
      transform: scale(1.05);
    }

    .voice-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .voice-btn.active {
      background: linear-gradient(135deg, #FF6B6B, #FA5252);
      box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
    }

    .btn-emoji {
      font-size: 1.3rem;
    }

    .reset-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: none;
      background: #f0f0f0;
      cursor: pointer;
      font-size: 1.3rem;
      transition: all 0.3s ease;
    }

    .reset-btn:hover:not(:disabled) {
      background: #e0e0e0;
      transform: scale(1.1);
    }

    .reset-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Tip Area */
    .tip-area {
      padding: 12px 20px;
      background: linear-gradient(135deg, #FFE066, #FFF3BF);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .tip-icon {
      font-size: 1.2rem;
    }

    .tip-text {
      font-size: 0.8rem;
      color: #333;
      font-weight: 600;
    }

    /* ============ RESPONSIVIDADE ============ */

    @media (max-width: 480px) {
      .voice-assistant-container {
        bottom: 10px;
        right: 10px;
      }

      .assistant-fab {
        width: 60px;
        height: 60px;
      }

      .assistant-panel {
        width: 290px;
        right: -5px;
      }
    }
  `]
})
export class VoiceAssistantComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('visualizerCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() autoInit = false;
  @Input() defaultCpf = '';

  state: AssistantState = 'idle';
  status = 'Ola! Sou o EVA! 🦄';
  isExpanded = false;
  hasCpf = false;
  cpfValue = '';
  userTranscript = '';
  aiResponse = '';

  private subscriptions = new Subscription();
  private animationId: number | null = null;
  private inputLevel = 0;
  private outputLevel = 0;

  // Dicas para criancas
  private tips = [
    'Clique no microfone e diga "Ola EVA!"',
    'Pergunte como falar uma palavra em ingles!',
    'Peca para eu contar uma historia!',
    'Vamos praticar a pronuncia juntos!',
    'Diga "EVA, me ajuda!" quando precisar!'
  ];
  private currentTipIndex = 0;
  private tipInterval: any = null;

  constructor(
    private voiceAssistant: VoiceAssistantService,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Apply default CPF if provided
    if (this.defaultCpf) {
      this.cpfValue = this.defaultCpf;
      this.saveCpf();
    }

    // Subscribe to state
    this.subscriptions.add(
      this.voiceAssistant.state$.subscribe(state => {
        this.state = state;
        this.cdRef.detectChanges();
      })
    );

    // Subscribe to status
    this.subscriptions.add(
      this.voiceAssistant.status$.subscribe(status => {
        this.status = status;
        this.cdRef.detectChanges();
      })
    );

    // Subscribe to audio events
    this.subscriptions.add(
      this.voiceAssistant.audioEvent$.subscribe(event => {
        if (event.type === 'input') {
          this.inputLevel = event.averageLevel;
        } else {
          this.outputLevel = event.averageLevel;
        }
      })
    );

    // Subscribe to transcripts
    this.subscriptions.add(
      this.voiceAssistant.transcript$.subscribe(text => {
        this.userTranscript = text;
        this.cdRef.detectChanges();
      })
    );

    this.subscriptions.add(
      this.voiceAssistant.aiResponse$.subscribe(text => {
        this.aiResponse = text;
        this.cdRef.detectChanges();
      })
    );

    // Rotate tips
    this.tipInterval = setInterval(() => {
      this.currentTipIndex = (this.currentTipIndex + 1) % this.tips.length;
      this.cdRef.detectChanges();
    }, 5000);

    // Auto init if configured
    if (this.autoInit) {
      this.voiceAssistant.initSession();
    }
  }

  ngAfterViewInit(): void {
    if (this.isExpanded) {
      this.startVisualization();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.tipInterval) {
      clearInterval(this.tipInterval);
    }
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      setTimeout(() => this.startVisualization(), 100);
    }
  }

  toggleListening(): void {
    this.voiceAssistant.toggleListening();
  }

  resetSession(): void {
    this.voiceAssistant.resetSession();
    this.userTranscript = '';
    this.aiResponse = '';
  }

  saveCpf(): void {
    if (this.cpfValue.length === 11) {
      this.hasCpf = true;
      this.voiceAssistant.setCpf(this.cpfValue);
    }
  }

  getStateEmoji(): string {
    const emojis: Record<AssistantState, string> = {
      'idle': '🦄',
      'listening': '👂',
      'thinking': '🤔',
      'speaking': '🗣️',
      'error': '😅',
      'connecting': '🔗'
    };
    return emojis[this.state];
  }

  getButtonText(): string {
    switch (this.state) {
      case 'listening': return 'Parar';
      case 'connecting': return 'Conectando...';
      default: return 'Falar';
    }
  }

  getCurrentTip(): string {
    return this.tips[this.currentTipIndex];
  }

  private startVisualization(): void {
    if (!this.canvasRef?.nativeElement) return;

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 320;
    canvas.height = 150;

    const visualize = () => {
      this.animationId = requestAnimationFrame(visualize);

      // Clear canvas
      ctx.fillStyle = 'rgba(26, 26, 46, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Input circles (green)
      for (let i = 0; i < 3; i++) {
        const radius = 20 + (i * 15) + (this.inputLevel * 100);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(105, 219, 124, ${0.5 - i * 0.15})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Output circles (blue)
      for (let i = 0; i < 3; i++) {
        const radius = 25 + (i * 12) + (this.outputLevel * 80);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(77, 171, 247, ${0.4 - i * 0.12})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Decay levels
      this.inputLevel *= 0.95;
      this.outputLevel *= 0.95;
    };

    visualize();
  }
}
