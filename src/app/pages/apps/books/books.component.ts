/**
 * Books Component - Leitor Unificado para Pessoas Especiais
 *
 * Combina funcionalidades de leitura de EPUB/PDF/Texto com:
 * - Acessibilidade avançada (dark mode, fonte disléxica, BeeLine reader)
 * - Leitura por voz usando Gemini Native Audio
 * - Reconhecimento de voz para prática
 * - Salvamento de progresso no Firebase
 *
 * Modelo de voz: gemini-2.5-flash-native-audio-preview-12-2025
 */

import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { GeminiAudioService } from 'src/app/core/services/ai/gemini-audio.service';
import { Subscription } from 'rxjs';
import screenfull from 'screenfull';
import ePub from 'epubjs';
import { animate, style, transition, trigger } from '@angular/animations';

// Interfaces
interface Ebook {
  title: string;
  author: string;
  path: string;
  cover: string;
  pageCount: number;
}

interface TextItem {
  _id?: { $oid: string };
  prime?: string;
  target?: string;
  text: string;
  level?: string;
  title?: string;
}

interface SavedProgress {
  id?: string;
  bookPath?: string;
  textId?: string;
  currentPage: number;
  currentSentence: number;
  timestamp: Date;
}

// Cores kids
const KIDS_COLORS = {
  purple: '#DA77F2',
  pink: '#F783AC',
  teal: '#38D9A9',
  green: '#69DB7C',
  orange: '#FFA94D',
  yellow: '#FFE066',
  blue: '#74C0FC',
  red: '#FF6B6B'
};

@Component({
  selector: 'app-books',
  templateUrl: './books.component.html',
  styleUrls: ['./books.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCardModule,
    MatProgressBarModule,
    MatSliderModule,
    MatTabsModule,
    MatExpansionModule,
    MatDialogModule,
    MatSnackBarModule,
    HttpClientModule
  ],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class BooksComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('textContainer') textContainer!: ElementRef;
  @ViewChild('epubContainer') epubContainer!: ElementRef;
  @ViewChild('captionContainer') captionContainer!: ElementRef;

  // Estado geral
  isLoading = true;
  loadingMessage = 'Carregando biblioteca...';
  activeTab: 'library' | 'epub' | 'text' = 'library';

  // Ebooks
  ebooks: Ebook[] = [];
  currentEbook: Ebook | null = null;
  book: any = null;
  rendition: any = null;
  totalPages = 0;
  currentPage = 0;

  // Textos
  texts: TextItem[] = [];
  currentText: TextItem | null = null;
  sentences: string[] = [];
  currentSentenceIndex = 0;
  currentWordIndex = 0;

  // Audio
  isSpeaking = false;
  isListening = false;
  currentSpokenText = '';

  // Acessibilidade
  isDarkMode = false;
  isDyslexicMode = false;
  isBeeLineActive = false;
  textSize = 18;
  selectedFont = 'Nunito';
  fonts = [
    'Nunito', 'Fredoka One', 'OpenDyslexic', 'Comic Sans MS', 'Arial',
    'Verdana', 'Georgia', 'Times New Roman', 'Calibri'
  ];

  // Legendas
  showCaptions = false;
  currentCaption = '';

  // Progresso
  progress: SavedProgress | null = null;
  totalCorrect = 0;
  totalErrors = 0;

  // Subscriptions
  private subscriptions = new Subscription();

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private layoutService: VexLayoutService,
    private geminiAudio: GeminiAudioService
  ) {}

  ngOnInit(): void {
    // Subscrever ao estado de audio
    this.subscriptions.add(
      this.geminiAudio.state$.subscribe(state => {
        this.isSpeaking = state === 'speaking';
        this.isListening = state === 'listening';
        this.cdr.detectChanges();
      })
    );

    // Carregar ebooks
    this.loadEbooks();
    this.loadTexts();
  }

  ngAfterViewInit(): void {
    // Fullscreen e collapse sidenav
    setTimeout(() => {
      if (screenfull.isEnabled) {
        screenfull.request().catch(() => {});
      }
      this.layoutService.collapseSidenav();
      this.cdr.detectChanges();
    });

    this.isLoading = false;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.geminiAudio.stopPlayback();
    if (this.book) {
      this.book.destroy();
    }
  }

  // ==================== CARREGAMENTO ====================

  /**
   * Carrega lista de ebooks disponíveis
   */
  loadEbooks(): void {
    this.http.get<Ebook[]>('assets/epub/ebooks.json').subscribe({
      next: (data) => {
        this.ebooks = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.showSnackBar('Erro ao carregar biblioteca');
      }
    });
  }

  /**
   * Carrega lista de textos classificados
   */
  loadTexts(): void {
    this.http.get<TextItem[]>('assets/json/TextCollection_classified.json').subscribe({
      next: (data) => {
        this.texts = data.slice(0, 100); // Limitar para performance
        this.cdr.detectChanges();
      },
      error: () => {}

    });
  }

  // ==================== EPUB ====================

  /**
   * Seleciona e carrega um ebook
   */
  async selectEbook(ebook: Ebook): Promise<void> {
    this.isLoading = true;
    this.loadingMessage = `Abrindo ${ebook.title}...`;
    this.currentEbook = ebook;

    try {
      // Limpar renderização anterior
      if (this.epubContainer?.nativeElement) {
        this.epubContainer.nativeElement.innerHTML = '';
      }

      this.book = ePub(ebook.path);
      await this.book.ready;

      this.rendition = this.book.renderTo(this.epubContainer.nativeElement, {
        width: '100%',
        height: '100%',
        spread: 'none'
      });

      await this.book.locations.generate(1024);
      this.totalPages = this.book.locations.length();
      this.currentPage = 1;

      await this.rendition.display();

      // Evento de mudança de página
      this.rendition.on('relocated', () => {
        this.updateCurrentPage();
      });

      this.activeTab = 'epub';
      this.isLoading = false;

      // Anunciar abertura do livro
      await this.speakText(`Abrindo o livro: ${ebook.title}. Tem ${this.totalPages} páginas.`);

    } catch (error) {
      this.showSnackBar('Erro ao abrir o livro');
      this.isLoading = false;
    }
  }

  /**
   * Atualiza a página atual
   */
  async updateCurrentPage(): Promise<void> {
    if (!this.rendition) return;

    const location = this.rendition.currentLocation();
    if (location?.start?.cfi) {
      const pageIndex = this.book.locations.locationFromCfi(location.start.cfi);
      this.currentPage = (pageIndex || 0) + 1;
      this.cdr.detectChanges();
    }
  }

  /**
   * Navega para próxima página
   */
  async nextPage(): Promise<void> {
    if (!this.rendition) return;
    await this.rendition.next();
    this.updateCurrentPage();
  }

  /**
   * Navega para página anterior
   */
  async prevPage(): Promise<void> {
    if (!this.rendition) return;
    await this.rendition.prev();
    this.updateCurrentPage();
  }

  /**
   * Lê a página atual em voz alta
   */
  async readCurrentPage(): Promise<void> {
    if (!this.rendition) return;

    try {
      // Capturar texto da página
      const contents = this.rendition.getContents();
      let pageText = '';

      contents.forEach((content: any) => {
        const doc = content.document || content.contentDocument;
        if (doc?.body) {
          pageText += doc.body.innerText || '';
        }
      });

      if (pageText.trim()) {
        await this.speakText(pageText);
      } else {
        this.showSnackBar('Não foi possível extrair o texto desta página');
      }

    } catch (error) {
      this.showSnackBar('Erro ao ler página');
    }
  }

  // ==================== TEXTO ====================

  /**
   * Seleciona um texto para leitura
   */
  selectText(text: TextItem): void {
    this.currentText = text;
    this.sentences = this.splitIntoSentences(text.text);
    this.currentSentenceIndex = 0;
    this.processText();
    this.activeTab = 'text';

    // Anunciar texto
    const preview = this.sentences[0] || '';
    this.speakText(`Texto selecionado. ${preview.substring(0, 50)}...`);
  }

  /**
   * Divide texto em sentenças
   */
  splitIntoSentences(text: string): string[] {
    const cleanText = text.replace(/\n+/g, ' ');
    const sentences = cleanText.match(/[^.!?;]+[.!?;]+|[^.!?;]+/g) || [];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Processa e renderiza o texto
   */
  processText(): void {
    if (!this.textContainer?.nativeElement) return;

    let html = '';
    this.sentences.forEach((sentence, index) => {
      const colorClass = `sentence-${index % 3}`;
      const words = sentence.split(' ').map((word, wIndex) =>
        `<span class="word" id="s${index}-w${wIndex}" style="font-size: ${this.textSize}px; font-family: ${this.selectedFont};">${word}</span>`
      ).join(' ');

      html += `<span class="${colorClass}" id="sentence-${index}" style="font-size: ${this.textSize}px; font-family: ${this.selectedFont};">${words}</span> `;
    });

    this.textContainer.nativeElement.innerHTML = html;
    this.applyAccessibilityStyles();
  }

  /**
   * Lê a próxima sentença
   */
  async readNextSentence(): Promise<void> {
    if (this.currentSentenceIndex >= this.sentences.length) {
      this.showSnackBar('Leitura concluída!');
      await this.speakText('Parabéns! Você terminou a leitura!');
      return;
    }

    const sentence = this.sentences[this.currentSentenceIndex];
    this.highlightSentence(this.currentSentenceIndex);
    this.currentCaption = sentence;

    await this.speakText(sentence, () => {
      this.currentSentenceIndex++;
      if (this.currentSentenceIndex < this.sentences.length) {
        setTimeout(() => this.readNextSentence(), 500);
      }
    });
  }

  /**
   * Destaca uma sentença
   */
  highlightSentence(index: number): void {
    // Remover destaque anterior
    const allSentences = this.textContainer?.nativeElement.querySelectorAll('[id^="sentence-"]');
    allSentences?.forEach((el: HTMLElement) => {
      el.style.backgroundColor = '';
      el.classList.remove('current-sentence');
    });

    // Destacar sentença atual
    const sentenceEl = this.textContainer?.nativeElement.querySelector(`#sentence-${index}`);
    if (sentenceEl) {
      sentenceEl.style.backgroundColor = this.isDarkMode ?
        'rgba(218, 119, 242, 0.3)' : 'rgba(218, 119, 242, 0.2)';
      sentenceEl.classList.add('current-sentence');
      sentenceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // ==================== AUDIO COM GEMINI ====================

  /**
   * Fala texto usando Gemini Native Audio
   */
  async speakText(text: string, onEnd?: () => void): Promise<void> {
    if (!text.trim()) return;

    try {
      // Prompt para leitura clara e pausada
      const prompt = `Você é um leitor de livros para crianças e pessoas com necessidades especiais.
        Leia o texto de forma clara, pausada e acolhedora.
        Use entonação amigável e faça pausas naturais entre as frases.`;

      if (!this.geminiAudio['isSessionActive']) {
        await this.geminiAudio.connect(prompt);
      }

      await this.geminiAudio.speak(text, onEnd);

    } catch (error) {
      // Fallback para browser TTS
      this.fallbackSpeak(text, onEnd);
    }
  }

  /**
   * Fallback para TTS do navegador
   */
  private fallbackSpeak(text: string, onEnd?: () => void): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.8;

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Para o áudio
   */
  stopAudio(): void {
    this.geminiAudio.stopPlayback();
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
  }

  /**
   * Inicia reconhecimento de voz
   */
  async startListening(): Promise<void> {
    try {
      await this.geminiAudio.startListening();
    } catch (error) {
      this.showSnackBar('Erro ao acessar microfone');
    }
  }

  /**
   * Para reconhecimento de voz
   */
  stopListening(): void {
    this.geminiAudio.stopListening();
  }

  // ==================== ACESSIBILIDADE ====================

  /**
   * Aplica estilos de acessibilidade
   */
  applyAccessibilityStyles(): void {
    if (!this.textContainer?.nativeElement) return;

    const container = this.textContainer.nativeElement;

    // Dark mode
    if (this.isDarkMode) {
      container.style.backgroundColor = '#1a1a2e';
      container.style.color = '#ffffff';
    } else {
      container.style.backgroundColor = '';
      container.style.color = '';
    }

    // Modo disléxico
    if (this.isDyslexicMode) {
      container.classList.add('dyslexic-mode');
    } else {
      container.classList.remove('dyslexic-mode');
    }
  }

  /**
   * Alterna modo escuro
   */
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    this.applyAccessibilityStyles();

    if (this.isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  /**
   * Alterna modo disléxico
   */
  toggleDyslexicMode(): void {
    this.isDyslexicMode = !this.isDyslexicMode;
    if (this.isDyslexicMode) {
      this.selectedFont = 'OpenDyslexic';
    }
    this.processText();
  }

  /**
   * Aplica BeeLine Reader (gradiente de cores)
   */
  toggleBeeLineReader(): void {
    this.isBeeLineActive = !this.isBeeLineActive;

    if (this.isBeeLineActive && this.textContainer?.nativeElement) {
      const container = this.textContainer.nativeElement;
      const text = container.innerText;
      const words = text.split(' ');

      const colors = [
        [116, 192, 252], // Azul
        [218, 119, 242], // Roxo
        [255, 107, 107], // Vermelho
        [56, 217, 169]   // Teal
      ];

      const gradientWords = 50;
      const colorStops = colors.length - 1;
      const wordsPerStop = Math.floor(gradientWords / colorStops);

      const html = words.map((word: string, index: number) => {
        const stopIndex = Math.floor((index % gradientWords) / wordsPerStop);
        const t = ((index % gradientWords) % wordsPerStop) / wordsPerStop;
        const startColor = colors[stopIndex];
        const endColor = colors[(stopIndex + 1) % colors.length];
        const color = startColor.map((start, i) =>
          Math.round(start + (endColor[i] - start) * t)
        );
        return `<span style="color: rgb(${color.join(',')});">${word}</span>`;
      }).join(' ');

      container.innerHTML = html;
    } else {
      this.processText();
    }
  }

  /**
   * Aumenta tamanho da fonte
   */
  increaseTextSize(): void {
    this.textSize = Math.min(this.textSize + 2, 48);
    this.processText();
  }

  /**
   * Diminui tamanho da fonte
   */
  decreaseTextSize(): void {
    this.textSize = Math.max(this.textSize - 2, 12);
    this.processText();
  }

  /**
   * Muda a fonte
   */
  changeFont(font: string): void {
    this.selectedFont = font;
    this.processText();
  }

  /**
   * Alterna legendas
   */
  toggleCaptions(): void {
    this.showCaptions = !this.showCaptions;
  }

  // ==================== UTILITÁRIOS ====================

  /**
   * Volta para a biblioteca
   */
  goBack(): void {
    this.activeTab = 'library';
    this.currentEbook = null;
    this.currentText = null;
    this.stopAudio();
  }

  /**
   * Mostra snackbar
   */
  showSnackBar(message: string): void {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  /**
   * Calcula progresso de leitura
   */
  get readingProgress(): number {
    if (this.activeTab === 'epub' && this.totalPages > 0) {
      return Math.round((this.currentPage / this.totalPages) * 100);
    }
    if (this.activeTab === 'text' && this.sentences.length > 0) {
      return Math.round((this.currentSentenceIndex / this.sentences.length) * 100);
    }
    return 0;
  }
}
