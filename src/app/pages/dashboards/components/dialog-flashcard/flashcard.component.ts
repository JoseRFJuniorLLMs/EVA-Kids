/**
 * Flashcard Component - Aprendizado de Vocabulario com Gemini Audio
 *
 * Usa a API nativa de audio do Gemini para pronuncia de alta qualidade:
 * - gemini-2.5-flash-native-audio-preview-12-2025
 */

import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AfterViewInit, Component, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HighlightModule } from 'ngx-highlightjs';
import { QuillEditorComponent } from 'ngx-quill';
import { GeminiAudioService } from 'src/app/core/services/ai/gemini-audio.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'vex-flashcard',
  standalone: true,
  templateUrl: 'flashcard.component.html',
  styleUrls: ['flashcard.component.scss'],
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    QuillEditorComponent,
    MatRippleModule,
    MatTooltipModule,
    MatCardModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    HttpClientModule,
    MatStepperModule,
    MatProgressBarModule,
    MatDividerModule,
    HighlightModule,
    MatProgressSpinnerModule,
    CommonModule
  ],
  animations: [
    trigger('fade', [
      transition('void => *', [
        style({ opacity: 0 }),
        animate(1000, style({ opacity: 1 }))
      ]),
      transition('* => void', [
        animate(1000, style({ opacity: 0 }))
      ])
    ])
  ]
})
export class FlashcardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('audioVisualizer') visualizerRef!: ElementRef<HTMLCanvasElement>;

  // Lista de palavras e traducoes
  words: string[] = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
    'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no',
    'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
    'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well',
    'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
    // Cores
    'red', 'blue', 'yellow', 'green', 'black', 'white', 'gray', 'orange', 'purple', 'pink', 'brown',
    // Dias da semana
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    // Numeros
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    // Familia
    'mom', 'dad', 'friend', 'family', 'brother', 'sister',
    // Animais
    'dog', 'cat', 'bird', 'fish', 'bear', 'elephant', 'lion', 'tiger', 'monkey',
    // Objetos
    'book', 'ball', 'car', 'toy', 'house', 'school', 'chair', 'table', 'bed',
    // Acoes
    'play', 'run', 'jump', 'swim', 'read', 'write', 'draw', 'sing', 'dance',
    // Alimentos
    'apple', 'banana', 'orange', 'milk', 'water', 'juice', 'bread', 'cake', 'ice cream',
    // Natureza
    'sun', 'moon', 'star', 'tree', 'flower', 'rain', 'snow', 'cloud', 'sky'
  ];

  translations: string[] = [
    'o, a, os, as', 'ser, estar', 'para, a', 'de', 'e', 'um, uma', 'em', 'que', 'ter', 'eu', 'ele, ela, isso', 'para', 'nao', 'em, sobre', 'com', 'ele', 'como', 'voce', 'fazer', 'em',
    'isso', 'mas', 'dele', 'por', 'de', 'eles', 'nos', 'dizer', 'dela', 'ela', 'ou', 'um, uma', 'vai', 'meu', 'um', 'todo, todos', 'iria', 'la', 'deles', 'o que', 'entao', 'acima', 'fora', 'se',
    'sobre', 'quem', 'obter', 'qual', 'ir', 'me', 'quando', 'fazer', 'poder', 'gostar', 'tempo', 'nao', 'apenas', 'ele', 'saber', 'pegar', 'pessoas', 'em', 'ano', 'seu', 'bom', 'algum',
    'poderia', 'eles', 'ver', 'outro', 'do que', 'entao', 'agora', 'olhar', 'somente', 'vir', 'seu', 'sobre', 'pensar', 'tambem', 'voltar', 'depois', 'usar', 'dois', 'como', 'nosso', 'trabalhar',
    'primeiro', 'bem', 'caminho', 'ate mesmo', 'novo', 'querer', 'porque', 'algum', 'estes', 'dar', 'dia', 'mais', 'nos',
    // Cores
    'vermelho', 'azul', 'amarelo', 'verde', 'preto', 'branco', 'cinza', 'laranja', 'roxo', 'rosa', 'marrom',
    // Dias
    'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado', 'domingo',
    // Numeros
    'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
    // Familia
    'mae', 'pai', 'amigo', 'familia', 'irmao', 'irma',
    // Animais
    'cachorro', 'gato', 'passaro', 'peixe', 'urso', 'elefante', 'leao', 'tigre', 'macaco',
    // Objetos
    'livro', 'bola', 'carro', 'brinquedo', 'casa', 'escola', 'cadeira', 'mesa', 'cama',
    // Acoes
    'brincar', 'correr', 'pular', 'nadar', 'ler', 'escrever', 'desenhar', 'cantar', 'dancar',
    // Alimentos
    'maca', 'banana', 'laranja', 'leite', 'agua', 'suco', 'pao', 'bolo', 'sorvete',
    // Natureza
    'sol', 'lua', 'estrela', 'arvore', 'flor', 'chuva', 'neve', 'nuvem', 'ceu'
  ];

  currentWordIndex = 0;
  isLoading = false;
  errorText = '';
  showTranslation = false;
  autoChangeEnabled = false;
  autoChangeInterval: any;
  isSpeaking = false;

  // Canvas para visualizacao
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  private audioLevel = 0;
  private subscriptions = new Subscription();

  constructor(private geminiAudio: GeminiAudioService) {}

  ngAfterViewInit(): void {
    // Iniciar visualizacao
    this.setupVisualization();

    // Subscrever aos eventos de audio
    this.subscriptions.add(
      this.geminiAudio.audioEvent$.subscribe(event => {
        this.audioLevel = event.averageLevel;
      })
    );

    this.subscriptions.add(
      this.geminiAudio.state$.subscribe(state => {
        this.isSpeaking = state === 'speaking';
      })
    );

    // Falar primeira palavra
    this.speakWord(this.words[this.currentWordIndex]);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.autoChangeInterval) {
      clearInterval(this.autoChangeInterval);
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.geminiAudio.stopPlayback();
  }

  /**
   * Configura visualizacao de audio
   */
  private setupVisualization(): void {
    if (!this.visualizerRef?.nativeElement) return;

    const canvas = this.visualizerRef.nativeElement;
    this.canvasCtx = canvas.getContext('2d');
    if (!this.canvasCtx) return;

    canvas.width = 300;
    canvas.height = 100;

    const visualize = () => {
      this.animationId = requestAnimationFrame(visualize);
      if (!this.canvasCtx) return;

      // Limpar canvas
      this.canvasCtx.fillStyle = 'rgba(45, 27, 78, 0.1)';
      this.canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Desenhar ondas baseadas no nivel de audio
      const centerY = canvas.height / 2;
      const amplitude = this.audioLevel * 80;

      this.canvasCtx.beginPath();
      this.canvasCtx.moveTo(0, centerY);

      for (let x = 0; x < canvas.width; x++) {
        const y = centerY + Math.sin((x + Date.now() / 50) * 0.05) * amplitude;
        this.canvasCtx.lineTo(x, y);
      }

      this.canvasCtx.strokeStyle = this.isSpeaking ?
        'rgba(105, 219, 124, 0.8)' :
        'rgba(218, 119, 242, 0.6)';
      this.canvasCtx.lineWidth = 3;
      this.canvasCtx.stroke();

      // Desenhar circulo central pulsante
      const radius = 20 + amplitude;
      this.canvasCtx.beginPath();
      this.canvasCtx.arc(canvas.width / 2, centerY, radius, 0, Math.PI * 2);
      this.canvasCtx.fillStyle = this.isSpeaking ?
        'rgba(105, 219, 124, 0.3)' :
        'rgba(218, 119, 242, 0.2)';
      this.canvasCtx.fill();

      // Decair nivel
      this.audioLevel *= 0.95;
    };

    visualize();
  }

  /**
   * Mostra proxima palavra
   */
  showNextWord(): void {
    this.showTranslation = false;
    this.currentWordIndex = (this.currentWordIndex + 1) % this.words.length;
    this.speakWord(this.words[this.currentWordIndex]);
  }

  /**
   * Mostra traducao e fala
   */
  showTranslationAndSpeak(): void {
    this.showTranslation = true;
    this.speakTranslation(this.translations[this.currentWordIndex]);
  }

  /**
   * Toggle auto-play
   */
  toggleAutoChange(): void {
    if (this.autoChangeEnabled) {
      clearInterval(this.autoChangeInterval);
    } else {
      this.autoChangeInterval = setInterval(() => {
        this.speakWord(this.words[this.currentWordIndex], () => {
          this.showTranslation = true;
          setTimeout(() => {
            this.speakTranslation(this.translations[this.currentWordIndex], () => {
              this.showNextWord();
              this.showTranslation = false;
            });
          }, 1000);
        });
      }, 6000);
    }
    this.autoChangeEnabled = !this.autoChangeEnabled;
  }

  /**
   * Fala palavra em ingles usando Gemini Native Audio
   */
  async speakWord(word: string, callback?: () => void): Promise<void> {
    this.isLoading = true;
    this.errorText = '';

    try {
      // Conectar com prompt de pronuncia em ingles
      const prompt = `You are a pronunciation tutor for children learning English. When asked to say a word, pronounce it clearly and slowly in English. Only say the word requested, nothing else. Be encouraging and friendly.`;

      if (!this.geminiAudio['isSessionActive']) {
        await this.geminiAudio.connect(prompt);
      }

      // Falar a palavra
      await this.geminiAudio.speak(`Say the word: "${word}"`, () => {
        this.isLoading = false;
        if (callback) callback();
      });

    } catch (error) {
      this.errorText = 'Erro ao reproduzir audio';
      this.isLoading = false;

      // Fallback para browser TTS
      this.fallbackSpeak(word, 'en-US', callback);
    }
  }

  /**
   * Fala traducao em portugues usando Gemini Native Audio
   */
  async speakTranslation(translation: string, callback?: () => void): Promise<void> {
    this.isLoading = true;

    try {
      const prompt = `Voce e um tutor de pronuncia para criancas. Quando pedirem para falar uma palavra, pronuncie claramente e devagar em portugues brasileiro. Fale apenas a palavra solicitada, nada mais.`;

      if (!this.geminiAudio['isSessionActive']) {
        await this.geminiAudio.connect(prompt);
      }

      await this.geminiAudio.speak(`Diga a palavra: "${translation}"`, () => {
        this.isLoading = false;
        if (callback) callback();
      });

    } catch (error) {
      // Fallback para browser TTS
      this.fallbackSpeak(translation, 'pt-BR', callback);
    }
  }

  /**
   * Fallback para browser TTS
   */
  private fallbackSpeak(text: string, lang: string, callback?: () => void): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.8;

    utterance.onend = () => {
      this.isLoading = false;
      if (callback) callback();
    };

    utterance.onerror = () => {
      this.isLoading = false;
      if (callback) callback();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Repete a palavra atual
   */
  repeatWord(): void {
    this.speakWord(this.words[this.currentWordIndex]);
  }

  /**
   * Para o audio
   */
  stopAudio(): void {
    this.geminiAudio.stopPlayback();
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
    this.isLoading = false;
  }
}
