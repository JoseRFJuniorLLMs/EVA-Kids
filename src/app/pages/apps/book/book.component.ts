/**
 * Unified Books Component
 *
 * Two features:
 * 1. Livros Interativos - Interactive books by level with AI reading and captions
 * 2. Biblioteca EPUB - EPUB library with covers, read by AI
 *
 * Uses UnifiedAIService for TTS (Gemini-powered with browser fallback)
 */
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition
} from '@angular/material/snack-bar';

import ePub from 'epubjs';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { UnifiedAIService } from 'src/app/core/services/ai/unified-ai.service';
import { DatatextService } from '../book3/datatext.service';
import { TextItem } from '../book3/text-item.interface';
import { AuthService } from '../../pages/auth/login/auth.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';

interface Ebook {
  title: string;
  author: string;
  path: string;
  cover: string;
  pageCount: number;
}

interface SavedText {
  id: string;
  fileName: string;
  content: string;
  pageRead: number;
  userId: string;
  userName: string;
  timestamp: firebase.firestore.Timestamp;
}

@Component({
  selector: 'book',
  templateUrl: 'book.html',
  styleUrls: ['book.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    MatBadgeModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    FormsModule,
    CommonModule,
    MatExpansionModule
  ]
})
export class BookComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ViewChildren
  @ViewChild('textContainer') textContainer!: ElementRef;
  @ViewChild('captionContainer') captionContainer!: ElementRef;

  // Current tab
  selectedTab = 0;

  // === INTERACTIVE BOOKS (from book3) ===
  texts: TextItem[] = [];
  filteredTexts: TextItem[] = [];
  currentText: TextItem | null = null;
  sentences: string[] = [];
  currentSentenceIndex = 0;
  currentWordIndex = 0;
  isReading = false;
  showTable = true;
  showCaptions = false;
  currentSentence: string | null = null;

  // Accessibility
  isDarkMode = false;
  isDyslexicMode = false;
  isBeeLineActive = false;
  textSize = 20;
  selectedFont = 'Nunito';
  fonts = ['Nunito', 'Fredoka', 'Comic Sans MS', 'OpenDyslexic', 'Arial', 'Verdana'];

  // Levels & pagination
  uniqueLevels: string[] = [];
  selectedLevel = '';
  page = 0;
  pageSize = 50;

  // Voice
  voices: SpeechSynthesisVoice[] = [];
  selectedVoice: SpeechSynthesisVoice | null = null;

  // Saved texts (Firebase)
  savedTexts: SavedText[] = [];
  showSavedTexts = false;

  // Highlight tracking
  private previousSentenceElement: HTMLElement | null = null;
  private previousWordElement: HTMLElement | null = null;

  // === EPUB LIBRARY (from book) ===
  ebooks: Ebook[] = [];
  book: any;
  rendition: any;
  totalPages = 0;
  currentPage = 0;
  selectedEbook: Ebook | null = null;
  isEpubReading = false;
  epubCurrentText = '';

  // Snackbar config
  horizontalPosition: MatSnackBarHorizontalPosition = 'end';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';

  constructor(
    private http: HttpClient,
    private _snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef,
    private aiService: UnifiedAIService,
    private datatextService: DatatextService,
    private authService: AuthService,
    private firestore: AngularFirestore
  ) {}

  ngOnInit() {
    // Load interactive books
    this.loadUniqueLevels();
    this.loadTextsByPage();
    this.loadVoices();
    this.loadSavedTexts();

    // Load EPUB library
    this.loadEbooks();

    // Listen for window resize
    window.addEventListener('resize', this.resizeListener);
  }

  ngAfterViewInit() {
    // Initial setup
    this.changeDetectorRef.detectChanges();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', this.resizeListener);
    this.aiService.stopSpeaking();
    if (this.book) {
      this.book.destroy?.();
    }
  }

  private resizeListener = () => {
    if (this.rendition) {
      this.rendition.resize(window.innerWidth * 0.9, window.innerHeight * 0.7);
    }
  };

  // ==================== TAB CHANGE ====================
  onTabChange(index: number) {
    this.selectedTab = index;
    this.aiService.stopSpeaking();
    this.isReading = false;
    this.isEpubReading = false;
  }

  // ==================== INTERACTIVE BOOKS ====================

  loadUniqueLevels(): void {
    this.datatextService.getUniqueLevels()
      .pipe(takeUntil(this.destroy$))
      .subscribe((levels: string[]) => {
        this.uniqueLevels = levels;
        this.changeDetectorRef.detectChanges();
      });
  }

  loadTextsByPage(): void {
    const observable = this.selectedLevel
      ? this.datatextService.getFilteredTextsByPage(this.page, this.pageSize, this.selectedLevel)
      : this.datatextService.getTextsByPage(this.page, this.pageSize);

    observable.pipe(takeUntil(this.destroy$)).subscribe((texts: TextItem[]) => {
      this.texts = texts;
      this.filteredTexts = this.texts;
      this.changeDetectorRef.detectChanges();
    });
  }

  filterByLevel(event: Event): void {
    this.selectedLevel = (event.target as HTMLSelectElement).value;
    this.page = 0;
    this.loadTextsByPage();
  }

  nextPage(): void {
    this.page++;
    this.loadTextsByPage();
  }

  previousPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadTextsByPage();
    }
  }

  selectText(index: number): void {
    const globalIndex = this.page * this.pageSize + index;
    this.datatextService.getTextByIndex(globalIndex)
      .pipe(takeUntil(this.destroy$))
      .subscribe((textItem: TextItem | null) => {
        if (textItem) {
          this.currentText = textItem;
          this.sentences = this.splitIntoSentences(textItem.text);
          this.currentSentenceIndex = 0;
          this.processText();
          this.showTable = false;
          this.showCaptions = true;
          this.openSnackBar('Livro carregado! Clique em PLAY para comecar');
        }
      });
  }

  splitIntoSentences(text: string): string[] {
    const cleanText = text.replace(/\n+/g, ' ');
    const sentences = cleanText.match(/[^.!?;]+[.!?;]+|[^.!?;]+/g) || [];
    return sentences.map(sentence => sentence.trim()).filter(sentence => sentence.length > 0);
  }

  processText(): void {
    if (!this.textContainer) return;

    let processedText = '';
    this.sentences.forEach((sentence, index) => {
      const colorClass = `sentence-${index % 3}`;
      processedText += `<span class="${colorClass}" id="sentence-${index}" style="font-size: ${this.textSize}px; font-family: '${this.selectedFont}', sans-serif;">${this.highlightWords(sentence.trim(), index)}</span> `;
    });
    this.textContainer.nativeElement.innerHTML = processedText.trim();
  }

  highlightWords(sentence: string, sentenceIndex: number): string {
    const words = sentence.split(' ');
    return words.map((word, wordIndex) =>
      `<span class="word" id="sentence-${sentenceIndex}-word-${wordIndex}" style="font-size: ${this.textSize}px; font-family: '${this.selectedFont}', sans-serif;">${word}</span>`
    ).join(' ');
  }

  // Reading control
  toggleReading(): void {
    if (this.isReading) {
      this.pauseReading();
    } else {
      this.startReading();
    }
  }

  startReading(): void {
    if (!this.isReading && this.sentences.length > 0) {
      this.isReading = true;
      this.readNextSentence();
    }
  }

  pauseReading(): void {
    this.isReading = false;
    this.aiService.stopSpeaking();
  }

  stopReading(): void {
    this.isReading = false;
    this.aiService.stopSpeaking();
    this.currentSentenceIndex = 0;
  }

  async readNextSentence(): Promise<void> {
    if (!this.isReading || this.currentSentenceIndex >= this.sentences.length) {
      this.isReading = false;
      this.currentSentence = null;
      this.openSnackBar('Leitura concluida! Muito bem!');
      return;
    }

    const sentenceElement = this.textContainer.nativeElement.querySelector(`#sentence-${this.currentSentenceIndex}`);
    this.highlightSentence(sentenceElement);

    const currentSentenceText = this.sentences[this.currentSentenceIndex];
    this.currentSentence = currentSentenceText;

    try {
      await this.aiService.speakWithHighlighting(
        currentSentenceText,
        (charIndex) => this.highlightWordAtChar(charIndex),
        { language: 'en-GB', speed: 0.9 }
      );

      this.removeHighlight(this.previousSentenceElement);
      this.previousSentenceElement = sentenceElement;
      this.currentSentenceIndex++;

      if (this.isReading) {
        setTimeout(() => this.readNextSentence(), 300);
      }
    } catch (error) {
      console.error('Error reading sentence:', error);
      this.isReading = false;
    }
  }

  highlightSentence(element: HTMLElement | null): void {
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.style.backgroundColor = 'rgba(218, 119, 242, 0.2)';
      element.classList.add('current-sentence');
    }
  }

  highlightWordAtChar(charIndex: number): void {
    const sentence = this.sentences[this.currentSentenceIndex];
    const words = sentence.split(' ');
    let currentCharIndex = 0;

    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
      const word = words[wordIndex];
      currentCharIndex += word.length + 1;
      if (currentCharIndex > charIndex) {
        const wordElement = this.textContainer.nativeElement.querySelector(
          `#sentence-${this.currentSentenceIndex}-word-${wordIndex}`
        );
        this.highlightWordElement(wordElement);
        this.updateCaptionHighlight(wordIndex);
        break;
      }
    }
  }

  highlightWordElement(element: HTMLElement | null): void {
    if (element) {
      if (this.previousWordElement) {
        this.previousWordElement.style.backgroundColor = '';
      }
      element.style.backgroundColor = 'rgba(255, 165, 0, 0.3)';
      this.previousWordElement = element;
    }
  }

  updateCaptionHighlight(wordIndex: number): void {
    if (this.captionContainer && this.showCaptions && this.currentSentence) {
      const words = this.currentSentence.split(' ');
      const highlightedWords = words.map((word, index) => {
        if (index === wordIndex) {
          return `<span class="highlighted-word">${word}</span>`;
        }
        return word;
      }).join(' ');
      this.captionContainer.nativeElement.innerHTML = highlightedWords;
    }
  }

  removeHighlight(element: HTMLElement | null): void {
    if (element) {
      element.style.backgroundColor = '';
      element.classList.remove('current-sentence');
    }
  }

  goBackToList(): void {
    this.showTable = true;
    this.currentText = null;
    this.aiService.stopSpeaking();
    this.isReading = false;
    if (this.textContainer) {
      this.textContainer.nativeElement.innerHTML = '';
    }
  }

  // Accessibility
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    this.processText();
  }

  toggleDyslexicMode(): void {
    this.isDyslexicMode = !this.isDyslexicMode;
    if (this.isDyslexicMode) {
      this.selectedFont = 'OpenDyslexic';
    } else {
      this.selectedFont = 'Nunito';
    }
    this.processText();
  }

  applyBeeLineReader(): void {
    if (!this.textContainer) return;

    if (this.isBeeLineActive) {
      this.isBeeLineActive = false;
      this.processText();
    } else {
      const words = this.textContainer.nativeElement.innerText.split(' ');
      const colors = [
        [218, 119, 242],  // Kids purple
        [247, 131, 172],  // Kids pink
        [56, 217, 169],   // Kids teal
        [105, 219, 124]   // Kids green
      ];

      const gradientText = words.map((word: string, index: number) => {
        const colorIndex = index % colors.length;
        const color = colors[colorIndex];
        return `<span style="color: rgb(${color.join(',')});">${word}</span>`;
      }).join(' ');

      this.textContainer.nativeElement.innerHTML = gradientText;
      this.isBeeLineActive = true;
    }
  }

  increaseTextSize(): void {
    this.textSize = Math.min(this.textSize + 2, 40);
    this.processText();
  }

  decreaseTextSize(): void {
    this.textSize = Math.max(this.textSize - 2, 14);
    this.processText();
  }

  toggleCaptions(): void {
    this.showCaptions = !this.showCaptions;
  }

  // Voice
  loadVoices(): void {
    const loadVoicesInternal = () => {
      this.voices = speechSynthesis.getVoices();
      this.selectedVoice = this.voices.find(v => v.lang.startsWith('en')) || null;
      if (this.selectedVoice) {
        this.aiService.setVoice(this.selectedVoice.name);
      }
      this.changeDetectorRef.detectChanges();
    };

    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoicesInternal;
    }
    setTimeout(loadVoicesInternal, 100);
  }

  onVoiceChange(event: Event): void {
    const selectedVoiceName = (event.target as HTMLSelectElement).value;
    this.selectedVoice = this.voices.find(voice => voice.name === selectedVoiceName) || null;
    if (this.selectedVoice) {
      this.aiService.setVoice(this.selectedVoice.name);
    }
  }

  // Firebase saved texts
  async loadSavedTexts(): Promise<void> {
    try {
      const user = await this.authService.getCurrentUser();
      if (user) {
        this.firestore.collection<SavedText>('TextCollection', ref => ref.where('userId', '==', user.uid))
          .valueChanges({ idField: 'id' })
          .pipe(takeUntil(this.destroy$))
          .subscribe(texts => {
            this.savedTexts = texts;
            this.changeDetectorRef.detectChanges();
          });
      }
    } catch (error) {
      console.error('Error loading saved texts:', error);
    }
  }

  openSavedText(text: SavedText): void {
    this.sentences = this.splitIntoSentences(text.content);
    this.currentSentenceIndex = text.pageRead || 0;
    this.processText();
    this.showTable = false;
    this.showSavedTexts = false;
  }

  loadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        this.sentences = this.splitIntoSentences(text);
        this.currentSentenceIndex = 0;
        this.processText();
        this.showTable = false;
        this.saveToFirebase(file.name, text);
      };
      reader.readAsText(file);
    }
  }

  private async saveToFirebase(fileName: string, fileContent: string): Promise<void> {
    try {
      const user = await this.authService.getCurrentUser();
      if (user) {
        await this.firestore.collection('TextCollection').add({
          fileName,
          content: fileContent,
          pageRead: 0,
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          timestamp: new Date()
        });
        this.openSnackBar('Texto salvo na nuvem!');
      }
    } catch (error) {
      console.error('Error saving to Firebase:', error);
    }
  }

  // ==================== EPUB LIBRARY ====================

  loadEbooks(): void {
    this.http.get<Ebook[]>('../../assets/epub/ebooks.json')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.ebooks = data;
        this.changeDetectorRef.detectChanges();
      });
  }

  async selectEbook(ebook: Ebook): Promise<void> {
    this.selectedEbook = ebook;
    const displayArea = document.getElementById('epub-display-area');
    if (displayArea) {
      displayArea.innerHTML = '';
    }

    try {
      this.book = ePub(ebook.path);
      await this.book.ready;

      this.rendition = this.book.renderTo('epub-display-area', {
        width: '100%',
        height: '70vh',
        spread: 'none'
      });

      this.rendition.flow('scrolled-doc');
      await this.book.locations.generate(1024);
      this.totalPages = this.book.locations.length();
      this.currentPage = 1;

      await this.rendition.display();
      this.updateEpubText();

      this.rendition.on('relocated', () => {
        this.updateCurrentPage();
        this.updateEpubText();
      });

      this.openSnackBar(`${ebook.title} carregado! Clique em PLAY para ouvir`);
    } catch (error) {
      console.error('Error loading ebook:', error);
      this.openSnackBar('Erro ao carregar o livro');
    }
  }

  updateCurrentPage(): void {
    const currentLocation = this.rendition?.currentLocation();
    if (currentLocation?.start?.cfi) {
      const pageIndex = this.book.locations.locationFromCfi(currentLocation.start.cfi);
      this.currentPage = (pageIndex || 0) + 1;
    }
  }

  updateEpubText(): void {
    const displayArea = document.getElementById('epub-display-area');
    const iframe = displayArea?.querySelector('iframe');
    const contentDocument = iframe?.contentDocument || iframe?.contentWindow?.document;

    if (contentDocument?.body) {
      this.epubCurrentText = contentDocument.body.innerText || '';
    }
  }

  epubNextPage(): void {
    this.rendition?.next();
  }

  epubPrevPage(): void {
    this.rendition?.prev();
  }

  async toggleEpubReading(): Promise<void> {
    if (this.isEpubReading) {
      this.isEpubReading = false;
      this.aiService.stopSpeaking();
    } else {
      this.isEpubReading = true;
      await this.readEpubPage();
    }
  }

  async readEpubPage(): Promise<void> {
    if (!this.isEpubReading || !this.epubCurrentText) return;

    const sentences = this.splitIntoSentences(this.epubCurrentText);

    for (const sentence of sentences) {
      if (!this.isEpubReading) break;

      try {
        await this.aiService.speak({
          text: sentence,
          options: { language: 'en-GB', speed: 0.9 }
        });
      } catch (error) {
        console.error('Error reading epub:', error);
        break;
      }
    }

    if (this.isEpubReading) {
      this.epubNextPage();
      setTimeout(() => {
        this.updateEpubText();
        this.readEpubPage();
      }, 500);
    }
  }

  closeEpubReader(): void {
    this.selectedEbook = null;
    this.isEpubReading = false;
    this.aiService.stopSpeaking();
    if (this.book) {
      this.book.destroy?.();
      this.book = null;
    }
  }

  // ==================== UTILITIES ====================

  openSnackBar(textDisplay: string): void {
    this._snackBar.open(textDisplay, 'OK', {
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
      duration: 3000
    });
  }

  getLevelIcon(level: string): string {
    const icons: { [key: string]: string } = {
      'A0': 'child_care',
      'A1': 'school',
      'A2': 'lightbulb',
      'B1': 'auto_stories',
      'B2': 'trending_up',
      'C1': 'workspace_premium',
      'C2': 'emoji_events'
    };
    return icons[level] || 'help';
  }

  getLevelEmoji(level: string): string {
    const emojis: { [key: string]: string } = {
      'A0': '🌱',
      'A1': '📖',
      'A2': '💡',
      'B1': '📚',
      'B2': '🚀',
      'C1': '🏆',
      'C2': '⭐'
    };
    return emojis[level] || '📕';
  }
}
