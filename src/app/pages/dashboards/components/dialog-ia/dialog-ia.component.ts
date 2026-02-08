import { CommonModule } from '@angular/common';
import {
  HttpClient,
  HttpClientModule,
  HttpHeaders
} from '@angular/common/http';
import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { HighlightModule } from 'ngx-highlightjs';
import { QuillEditorComponent } from 'ngx-quill';

import nlp from 'compromise';
import WaveSurfer from 'wavesurfer.js';
//import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram'
import RecordPlugin from 'wavesurfer.js/dist/plugins/record';
import { UnifiedAIService } from 'src/app/core/services/ai/unified-ai.service';

// Extensão da interface WaveSurfer para incluir o RecordPlugin
interface WaveSurferWithRecord extends WaveSurfer {
  record: {
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    resumeRecording: () => void;
    pauseRecording: () => void;
    isRecording: () => boolean;
    isPaused: () => boolean;
  };
}

@Component({
  selector: 'app-dialog-ia',
  templateUrl: 'dialog-ia.component.html',
  styleUrls: ['dialog-ia.component.scss'],
  standalone: true,
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
  ]
})
export class DialogIAComponent implements OnInit {
  @ViewChild('playbackContainer') playbackContainer!: ElementRef;
  @ViewChild('spectrogram') spectrogramEl: ElementRef | undefined;
  @ViewChild('waveform') waveformEl!: ElementRef;
  @ViewChild('stepper') stepper!: MatStepper;
  waveSurferPlayback?: WaveSurfer;

  longText = ``;
  mediaRecorder?: MediaRecorder;
  audioChunks: any[] = [];
  isRecording = false;
  audio?: HTMLAudioElement;
  displayedHtml = ``;
  audioUrl: string | null = null;
  isPlaying: boolean = false;
  waveSurfer: WaveSurfer | null = null;
  isGeneratingAudio = false;
  chatMessage: string = this.data.texto;
  voices: string[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  isAudioReady: boolean = false;
  currentWordIndex: number = 0;
  words: string[] = [];
  isLoading: boolean = false;
  transcribedText: string = '';

  //NLP
  // Manipulação de Texto
  textNLP: string = '';
  pronouns: string[] = []; // Pronome
  verbs: string[] = []; // Verbo
  nouns: string[] = []; // Substantivo
  adjectives: string[] = []; // Adjetivo
  adverbs: string[] = []; // Advérbio
  people: string[] = []; // Pessoas
  places: string[] = []; // Lugares
  organizations: string[] = []; // Organizações
  dates: string[] = []; // Datas
  values: string[] = []; // Valores

  // Adicionando novas variáveis para funcionalidades adicionais
  phrases: any[] = []; // Frases
  clauses: string[] = []; // Cláusulas
  negations: string[] = []; // Negativas
  questions: string[] = []; // Perguntas
  quotes: string[] = []; // Citações
  acronyms: string[] = []; // Siglas
  emails: string[] = []; // E-mails
  urls: string[] = []; // URLs
  emojis: string[] = []; // Emojis
  mentions: string[] = []; // Menções (@usuario)
  hashtags: string[] = []; // Hashtags

  errorText = '';

  constructor(
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: { texto: string },
    private dialogRef: MatDialogRef<DialogIAComponent>,
    private aiService: UnifiedAIService
  ) {}

  /* ==================ngOnInit==================== */
  ngOnInit() {
    this.words = this.chatMessage.split(' ');
    this.initWaveSurfer();
    this.playSound();
    this.performAnalysis();
  } //fim

  /* ==================initWaveSurferPlayback==================== */
  private initWaveSurferPlayback(): void {
    // Garante que o container está disponível
    if (!this.playbackContainer) {
      console.error('Container para WaveSurfer não encontrado!');
      return;
    }
    // Criação da instância WaveSurfer
    this.waveSurferPlayback = WaveSurfer.create({
      container: this.playbackContainer.nativeElement,
      waveColor: 'rgb(128, 0, 0)',
      progressColor: 'rgb(255, 0, 0)',
      cursorColor: 'rgb(0, 0, 0)',
      cursorWidth: 6,
      barGap: 3,
      barWidth: 2,
      barHeight: 3,
      barRadius: 10,
      autoScroll: true,
      autoCenter: true,
      interact: true,
      dragToSeek: true,
      mediaControls: true,
      autoplay: true,
      fillParent: true
    });
    // Configura os eventos depois da inicialização
    this.setupWaveSurferEventsPlayback();
  } //fim

  private setupWaveSurferEventsPlayback(): void {
    // Verifica se waveSurferPlayback está definido.
    if (!this.waveSurferPlayback) return;

    // Configura eventos básicos.
    this.waveSurferPlayback.on('play', () => {
      this.isPlaying = true;
      console.log('Playback started');
    });

    this.waveSurferPlayback.on('pause', () => {
      this.isPlaying = false;
      console.log('Playback paused');
    });

    this.waveSurferPlayback.on('finish', () => {
      this.isPlaying = false;
      console.log('Playback finished');
    });
  } //fim

  /* ==================ngAfterViewInit==================== */
  ngAfterViewInit(): void {
    this.initWaveSurferPlayback();
    this.setupWaveSurferEventsPlayback();
    // Certifique-se de que o elemento waveform está disponível
    if (this.waveformEl) {
      // Criação do WaveSurfer com as configurações desejadas
      this.waveSurfer = WaveSurfer.create({
        container: this.waveformEl.nativeElement, // Ligando ao elemento do DOM
        waveColor: '#d3d3d3', // Cor da onda
        progressColor: '#0000FF', // Cor do progresso
        cursorColor: '#0000FF', // Cor do cursor
        cursorWidth: 6, // Largura do cursor
        barGap: 3, // Espaço entre as barras
        barWidth: 2, // Largura das barras
        barHeight: 3, // Altura das barras
        barRadius: 10, // Raio das bordas das barras
        autoScroll: true, // Rolagem automática
        autoCenter: true, // Centralização automática
        interact: true, // Interação habilitada
        dragToSeek: true, // Permite arrastar para buscar
        mediaControls: true, // Controles de mídia
        autoplay: true, // Autoplay
        fillParent: true // Preencher o elemento pai
      });
    }
  } //fim

  /* ==================VOZ ALEATORIA==================== */
  getRandomVoice(): string {
    const randomIndex = Math.floor(Math.random() * this.voices.length);
    return this.voices[randomIndex];
  } //fim

  /* ==================GERADOR DE AUDIO COM GEMINI==================== */
  generateAudio(): void {
    if (this.isGeneratingAudio) return;
    this.isGeneratingAudio = true;

    if (!this.chatMessage) {
      console.error('No chatMessage to generate audio from.');
      this.isGeneratingAudio = false;
      return;
    }

    // Use UnifiedAIService for browser-based TTS
    this.aiService.speakWithHighlighting(
      this.chatMessage,
      (charIndex, charLength) => {
        // Update word highlighting during speech
        this.updateWordHighlight(charIndex);
      },
      {
        voice: this.getRandomVoice(),
        language: 'en-GB'
      }
    ).then(() => {
      this.isAudioReady = true;
      this.isGeneratingAudio = false;
    }).catch((error) => {
      console.error('Error generating audio:', error);
      this.isGeneratingAudio = false;
    });
  } //fim

  /* ==================UPDATE WORD HIGHLIGHT==================== */
  private updateWordHighlight(charIndex: number): void {
    // Find which word corresponds to the character index
    let currentPos = 0;
    for (let i = 0; i < this.words.length; i++) {
      currentPos += this.words[i].length + 1; // +1 for space
      if (charIndex < currentPos) {
        this.currentWordIndex = i;
        break;
      }
    }
  } //fim

  /* ==================initWaveSurfer==================== */
  initWaveSurfer(): void {
    if (this.waveformEl) {
      this.waveSurfer = WaveSurfer.create({
        container: this.waveformEl.nativeElement,
        waveColor: 'violet',
        progressColor: 'purple',
        backend: 'WebAudio'
      });
    }
  } //fim

  /* ==================Função para atualizar o HTML que será exibido==================== */
  updateDisplayedHtml(htmlContent: string): void {
    this.displayedHtml = htmlContent;
  } //fim

  /* ==================activateMicrophone==================== */
  activateMicrophone(): void {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.start();
        this.audioChunks = [];
        this.mediaRecorder.ondataavailable = (event) => {
          this.audioChunks.push(event.data);
        };
      })
      .catch((err) => {
        console.error('Could not access the microphone', err);
      });
  } //fim

  /* ==================startRecording==================== */
  startRecording(): void {
    if (!this.isRecording) {
      this.activateMicrophone();
      this.isRecording = true;
      this.isLoading = true;
    }
  } //fim

  /* ==================stopRecording==================== */
  stopRecording(): void {
    if (!this.mediaRecorder) {
      return;
    }

    this.mediaRecorder.stop();
    this.isRecording = false;
    this.isLoading = false;

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl); // Libere a URL anterior, se houver
      }
      this.audioUrl = URL.createObjectURL(audioBlob); // Crie uma nova URL

      if (this.waveSurfer) {
        this.waveSurfer.load(this.audioUrl); // Carregue o áudio no WaveSurfer
      }

      this.loadAudio(this.audioUrl); // Carregue o áudio para reprodução direta

      // Aqui é onde chamamos a função de transcrição passando o Blob de áudio
      this.transcribeAudio(audioBlob);

      // Lembre-se de limpar/resetar os audioChunks para uma nova gravação
      this.audioChunks = [];
    };
  } //fim

  /* ==================loadAudio==================== */
  loadAudio(url: string): void {
    this.audio = new Audio(url);
  } //fim

  /* ==================playSound==================== */
  playSound(): void {
    // Verifica se o áudio já foi gerado e está pronto para ser reproduzido
    if (this.waveSurfer && this.isAudioReady) {
      // Iniciar a reprodução do áudio
      this.waveSurfer.play();

      // Iniciar a marcação de palavra por palavra
      this.highlightWords();

      // Avança para a próxima etapa após a reprodução do áudio
      setTimeout(() => {
        this.stepper.next();
      }, this.waveSurfer.getDuration() * 1000); // Espere pela duração do áudio antes de avançar
    } else {
      this.generateAudio();
    }
  } //fim

  /* ==================highlightWords==================== */
  highlightWords(): void {
    const interval = setInterval(() => {
      // Verifica se todas as palavras foram destacadas
      if (this.currentWordIndex >= this.words.length) {
        clearInterval(interval); // Limpa o intervalo
        return;
      }
      // Atualiza o HTML exibido com a palavra atual destacada
      const highlightedText = this.words
        .slice(0, this.currentWordIndex + 1)
        .join(' ');
      this.updateDisplayedHtml(highlightedText);
      // Move para a próxima palavra
      this.currentWordIndex++;
    }, 400);
  } //fim

  /* ==================pauseSound==================== */
  pauseSound(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  } //fim

  /* ==================stopSound==================== */
  stopSound(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  } //fim

  /* ==================closeDialog==================== */
  closeDialog(): void {
    this.dialogRef.close();
  } //fim

  /* ==================performAnalysis==================== */
  performAnalysis(): void {
    // Atualiza textNLP com o valor de chatMessage
    this.textNLP = this.chatMessage;
    // Agora chama analyzeText para processar o texto
    this.analyzeText();
  } //fim

  /* ==================Transcribe Audio==================== */
  transcribeAudio(audioBlob: Blob) {
    console.log('Tamanho do Blob:', audioBlob.size);
    console.log('Tipo do Blob:', audioBlob.type);

    // Use UnifiedAIService for transcription with Gemini
    this.aiService.transcribe({ audioBlob }).subscribe({
      next: (response) => {
        this.transcribedText = response.text;
      },
      error: (error) => {
        console.log('Error transcribing audio:', error);
      }
    });
  } //fim

  /* ==================analyzeText==================== */
  analyzeText() {
    const doc = nlp(this.chatMessage);
    // Análise básica
    this.pronouns = doc.pronouns().out('array');
    this.verbs = doc.verbs().out('array');
    this.nouns = doc.nouns().out('array');
    this.adjectives = doc.adjectives().out('array');
    this.adverbs = doc.adverbs().out('array');
    this.people = doc.people().out('array');
    this.places = doc.places().out('array');
    this.organizations = doc.organizations().out('array');
    this.clauses = doc.clauses().out('array'); // Cláusulas
    this.questions = doc.questions().out('array'); // Perguntas
    this.acronyms = doc.acronyms().out('array'); // Siglas
    this.emails = doc.emails().out('array'); // E-mails
    this.urls = doc.urls().out('array'); // URLs
  } //fim
}
