import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import nlp from 'compromise';

import { environment } from '../../../../environments/environment';
import {
  TextGenerationRequest,
  TextGenerationResponse,
  TextGenerationOptions,
  TTSRequest,
  TTSOptions,
  TTSVoice,
  STTRequest,
  STTResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  GrammarAnalysisResponse,
  GrammarWord,
  PartOfSpeech,
  GRAMMAR_COLORS,
  ChatMessage,
  ChatRequest,
  EducationalContentRequest,
  EducationalContentResponse,
  AIServiceState,
  AIServiceError
} from '../../models/ai.models';

/**
 * UnifiedAIService - Servico unificado de IA para EVA-Kids
 *
 * Roteia chamadas de texto pelo EVA backend (/api/chat).
 * Nenhuma API key no frontend - EVA gerencia Gemini server-side.
 *
 * - Text generation: EVA /api/chat
 * - TTS: Browser SpeechSynthesis
 * - STT: Browser SpeechRecognition
 * - Grammar: Compromise.js (local, sem API)
 */
@Injectable({
  providedIn: 'root'
})
export class UnifiedAIService {
  // EVA chat endpoint
  private chatUrl: string;

  // State management
  private stateSubject = new BehaviorSubject<AIServiceState>('idle');
  public state$ = this.stateSubject.asObservable();

  // Error handling
  private errorSubject = new Subject<AIServiceError>();
  public error$ = this.errorSubject.asObservable();

  // TTS state
  private speechSynthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;

  // Streaming text output
  private streamingText = new Subject<string>();
  public streamingText$ = this.streamingText.asObservable();

  constructor(
    private http: HttpClient,
    private zone: NgZone
  ) {
    this.chatUrl = environment.eva?.chatUrl || 'https://eva-ia.org:8091/api/chat';

    // Initialize browser TTS
    this.speechSynthesis = window.speechSynthesis;
    this.loadVoices();
  }

  // ==================== TEXT GENERATION (via EVA) ====================

  /**
   * Generate text using EVA backend
   */
  generateText(request: TextGenerationRequest): Observable<string> {
    this.stateSubject.next('loading');

    const prompt = this.buildPrompt(request);

    return this.http.post<any>(this.chatUrl, { message: prompt }).pipe(
      map((result: any) => {
        const text = result?.response || result?.text || result?.message || '';
        this.stateSubject.next('idle');
        return text;
      }),
      catchError(error => {
        this.handleError('TEXT_GENERATION_FAILED', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate text with streaming response
   */
  generateTextStream(request: TextGenerationRequest): Observable<string> {
    // EVA /api/chat returns a single response, simulate stream
    this.stateSubject.next('streaming');

    return this.generateText(request).pipe(
      tap(text => {
        this.streamingText.next(text);
        this.stateSubject.next('idle');
      })
    );
  }

  /**
   * Chat completion with message history
   */
  chat(request: ChatRequest): Observable<string> {
    const lastUserMessage = request.messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return throwError(() => new Error('No user message found'));
    }

    const context = request.messages
      .slice(0, -1)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = context
      ? `Previous conversation:\n${context}\n\nUser: ${lastUserMessage.content}\n\nAssistant:`
      : lastUserMessage.content;

    return this.generateText({ prompt, options: request.options });
  }

  // ==================== TEXT-TO-SPEECH (Browser API) ====================

  /**
   * Speak text using browser SpeechSynthesis
   */
  speak(request: TTSRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      this.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(request.text);

      const options = request.options || {};
      utterance.lang = options.language || 'en-GB';
      utterance.rate = options.speed || 1.0;
      utterance.pitch = options.pitch || 1.0;

      if (options.voice && options.voice !== 'default') {
        const voice = this.voices.find(v =>
          v.name.toLowerCase().includes(options.voice!.toLowerCase())
        );
        if (voice) {
          utterance.voice = voice;
        }
      } else if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event);

      this.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Speak text with word-by-word highlighting callback
   */
  speakWithHighlighting(
    text: string,
    onWordBoundary: (charIndex: number, charLength: number) => void,
    options?: TTSOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      this.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.language || 'en-GB';
      utterance.rate = options?.speed || 1.0;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          onWordBoundary(event.charIndex, event.charLength || 1);
        }
      };

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event);

      this.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Generate audio blob from text
   */
  generateAudioBlob(text: string, options?: TTSOptions): Observable<Blob> {
    return new Observable(observer => {
      this.speak({ text, options })
        .then(() => {
          observer.next(new Blob([], { type: 'audio/wav' }));
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  stopSpeaking(): void {
    this.speechSynthesis?.cancel();
  }

  pauseSpeaking(): void {
    this.speechSynthesis?.pause();
  }

  resumeSpeaking(): void {
    this.speechSynthesis?.resume();
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  setVoice(voiceName: string): void {
    this.selectedVoice = this.voices.find(v =>
      v.name.toLowerCase().includes(voiceName.toLowerCase())
    ) || null;
  }

  // ==================== SPEECH-TO-TEXT (Browser API) ====================

  /**
   * Transcribe audio using EVA backend
   */
  transcribe(request: STTRequest): Observable<STTResponse> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Audio = (reader.result as string).split(',')[1];

        this.http.post<any>(this.chatUrl, {
          message: request.options?.language
            ? `Transcribe this audio in ${request.options.language}. Return only the transcribed text.`
            : 'Transcribe this audio. Return only the transcribed text.',
          audio: base64Audio,
          audio_type: request.audioBlob.type || 'audio/webm'
        }).subscribe({
          next: (result) => {
            const text = result?.response || result?.text || '';
            observer.next({ text, confidence: 0.9 });
            observer.complete();
          },
          error: (error) => {
            this.handleError('TRANSCRIPTION_FAILED', error);
            observer.error(error);
          }
        });
      };
      reader.onerror = (error) => observer.error(error);
      reader.readAsDataURL(request.audioBlob);
    });
  }

  // ==================== IMAGE GENERATION ====================

  generateImage(request: ImageGenerationRequest): Observable<ImageGenerationResponse> {
    const enhancePrompt = `
      Enhance this image prompt for a children's educational application.
      Make it more descriptive and suitable for children.
      Original prompt: "${request.prompt}"
      Return only the enhanced prompt, nothing else.
    `;

    return this.generateText({ prompt: enhancePrompt }).pipe(
      map(enhancedPrompt => ({
        url: '',
        revisedPrompt: enhancedPrompt
      }))
    );
  }

  // ==================== GRAMMAR ANALYSIS (Compromise + EVA) ====================

  analyzeGrammar(text: string): Observable<GrammarAnalysisResponse> {
    return of(text).pipe(
      map(inputText => {
        const doc = nlp(inputText);
        const words: GrammarWord[] = [];

        doc.terms().forEach((term: any) => {
          const word = term.text();
          let type: PartOfSpeech = 'Unknown';

          if (term.has('#Noun')) type = 'Noun';
          else if (term.has('#Verb')) type = 'Verb';
          else if (term.has('#Adjective')) type = 'Adjective';
          else if (term.has('#Adverb')) type = 'Adverb';
          else if (term.has('#Pronoun')) type = 'Pronoun';
          else if (term.has('#Preposition')) type = 'Preposition';
          else if (term.has('#Conjunction')) type = 'Conjunction';
          else if (term.has('#Determiner')) type = 'Determiner';

          words.push({ word, type, color: GRAMMAR_COLORS[type] });
        });

        const sentences = doc.sentences().out('array') as string[];
        const summary = {
          nouns: words.filter(w => w.type === 'Noun').length,
          verbs: words.filter(w => w.type === 'Verb').length,
          adjectives: words.filter(w => w.type === 'Adjective').length,
          adverbs: words.filter(w => w.type === 'Adverb').length,
          pronouns: words.filter(w => w.type === 'Pronoun').length
        };

        return { words, sentences, summary };
      })
    );
  }

  explainGrammar(text: string, word: string): Observable<string> {
    const prompt = `
      Explain the grammar of the word "${word}" in this sentence: "${text}"
      Keep the explanation simple and suitable for children learning English.
      Include:
      1. What part of speech it is
      2. Why it's used that way
      3. A simple example sentence
    `;

    return this.generateText({ prompt });
  }

  // ==================== EDUCATIONAL CONTENT ====================

  generateEducationalContent(request: EducationalContentRequest): Observable<EducationalContentResponse> {
    let prompt = '';

    switch (request.type) {
      case 'phrase':
        prompt = `Generate 5 simple, engaging phrases for children that include the word "${request.targetWord || request.topic}".
                  Make them fun and memorable using memory palace techniques.
                  Format: One phrase per line.`;
        break;
      case 'text':
        prompt = `Write a short, imaginative story for children about "${request.topic}".
                  Use memory palace techniques to make it memorable.
                  Include the word "${request.targetWord}" if provided.
                  Keep it under 100 words and make it fun and educational.`;
        break;
      case 'word':
        prompt = `For the word "${request.targetWord || request.topic}", provide:
                  1. Simple definition suitable for children
                  2. An example sentence
                  3. A fun fact or memory trick
                  Keep each part brief.`;
        break;
      case 'story':
        prompt = `Create an engaging, educational story for children about "${request.topic}".
                  Use vivid imagery and memory palace techniques.
                  Make it suitable for children with learning disabilities.
                  Include simple vocabulary and clear sentences.
                  Keep it under 150 words.`;
        break;
    }

    return this.generateText({ prompt }).pipe(
      map(content => ({
        content,
        relatedPhrases: [],
        vocabulary: []
      }))
    );
  }

  // ==================== UTILITY METHODS ====================

  private buildPrompt(request: TextGenerationRequest): string {
    let prompt = request.prompt;
    if (request.options?.systemPrompt) {
      prompt = `${request.options.systemPrompt}\n\n${prompt}`;
    }
    return prompt;
  }

  private loadVoices(): void {
    const loadVoicesInternal = () => {
      this.voices = this.speechSynthesis.getVoices();
      this.selectedVoice = this.voices.find(v =>
        v.lang.startsWith('en') && /female|woman|girl/i.test(v.name)
      ) || this.voices.find(v => v.lang.startsWith('en')) || null;
    };

    if (this.speechSynthesis.onvoiceschanged !== undefined) {
      this.speechSynthesis.onvoiceschanged = loadVoicesInternal;
    }
    setTimeout(loadVoicesInternal, 100);
  }

  private handleError(code: string, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.stateSubject.next('error');
    this.errorSubject.next({ code, message, details: error });
  }

  isAvailable(): Observable<boolean> {
    return this.http.get<any>(`${environment.eva?.baseUrl || 'https://eva-ia.org:8091'}/api/health`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  getState(): AIServiceState {
    return this.stateSubject.value;
  }
}
