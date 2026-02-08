import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult } from '@google/generative-ai';
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
 * UnifiedAIService - Single AI service for all Priming application needs
 *
 * Replaces:
 * - OpenAI GPT-4 (text generation)
 * - OpenAI TTS (text-to-speech) -> Uses browser SpeechSynthesis
 * - OpenAI Whisper (speech-to-text) -> Uses browser SpeechRecognition
 * - OpenAI DALL-E (image generation) -> Uses Gemini Vision
 * - Ollama (local LLM) -> Uses Gemini
 *
 * Primary AI: Google Gemini
 * Fallbacks: Browser APIs for TTS/STT
 */
@Injectable({
  providedIn: 'root'
})
export class UnifiedAIService {
  // Gemini client
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

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
    // Initialize Gemini
    this.genAI = new GoogleGenerativeAI(environment.ai.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: environment.ai.gemini.models.text
    });

    // Initialize browser TTS
    this.speechSynthesis = window.speechSynthesis;
    this.loadVoices();
  }

  // ==================== TEXT GENERATION (Gemini) ====================

  /**
   * Generate text using Gemini
   * Replaces: OpenAI GPT-4, Ollama
   */
  generateText(request: TextGenerationRequest): Observable<string> {
    this.stateSubject.next('loading');

    const prompt = this.buildPrompt(request);

    return from(this.model.generateContent(prompt)).pipe(
      map((result: GenerateContentResult) => {
        const response = result.response;
        const text = response.text();
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
    this.stateSubject.next('streaming');

    const prompt = this.buildPrompt(request);

    return new Observable(observer => {
      (async () => {
        try {
          const result = await this.model.generateContentStream(prompt);
          let fullText = '';

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            this.zone.run(() => {
              this.streamingText.next(chunkText);
              observer.next(fullText);
            });
          }

          this.stateSubject.next('idle');
          observer.complete();
        } catch (error) {
          this.handleError('STREAM_GENERATION_FAILED', error);
          observer.error(error);
        }
      })();
    });
  }

  /**
   * Chat completion with message history
   */
  chat(request: ChatRequest): Observable<string> {
    const messages = request.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }]
    }));

    // Get the last user message as the prompt
    const lastUserMessage = request.messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return throwError(() => new Error('No user message found'));
    }

    // Build context from previous messages
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
   * Replaces: OpenAI TTS
   */
  speak(request: TTSRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(request.text);

      // Apply options
      const options = request.options || {};
      utterance.lang = options.language || 'en-GB';
      utterance.rate = options.speed || 1.0;
      utterance.pitch = options.pitch || 1.0;

      // Select voice
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
   * Returns a blob that can be played with WaveSurfer
   */
  generateAudioBlob(text: string, options?: TTSOptions): Observable<Blob> {
    // Browser SpeechSynthesis doesn't support direct blob generation
    // We'll use a MediaRecorder workaround or return empty for now
    // For full blob support, consider using a cloud TTS service

    return new Observable(observer => {
      // For now, we'll speak the text and return a placeholder
      // In production, use Google Cloud TTS or similar
      this.speak({ text, options })
        .then(() => {
          // Return empty blob as placeholder
          observer.next(new Blob([], { type: 'audio/wav' }));
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Stop current speech
   */
  stopSpeaking(): void {
    this.speechSynthesis?.cancel();
  }

  /**
   * Pause current speech
   */
  pauseSpeaking(): void {
    this.speechSynthesis?.pause();
  }

  /**
   * Resume paused speech
   */
  resumeSpeaking(): void {
    this.speechSynthesis?.resume();
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  /**
   * Set preferred voice by name
   */
  setVoice(voiceName: string): void {
    this.selectedVoice = this.voices.find(v =>
      v.name.toLowerCase().includes(voiceName.toLowerCase())
    ) || null;
  }

  // ==================== SPEECH-TO-TEXT (Browser API) ====================

  /**
   * Transcribe audio using browser SpeechRecognition
   * Replaces: OpenAI Whisper
   * Note: For file-based transcription, use Gemini multimodal
   */
  transcribe(request: STTRequest): Observable<STTResponse> {
    // For blob transcription, we need to use Gemini's multimodal capabilities
    // Browser SpeechRecognition only works with live microphone input

    return this.transcribeWithGemini(request.audioBlob, request.options?.language);
  }

  /**
   * Transcribe audio file using Gemini multimodal
   */
  private transcribeWithGemini(audioBlob: Blob, language?: string): Observable<STTResponse> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];

          const prompt = language
            ? `Transcribe this audio in ${language}. Return only the transcribed text.`
            : 'Transcribe this audio. Return only the transcribed text.';

          const result = await this.model.generateContent([
            prompt,
            {
              inlineData: {
                mimeType: audioBlob.type || 'audio/webm',
                data: base64Audio
              }
            }
          ]);

          const text = result.response.text();
          observer.next({ text, confidence: 0.9 });
          observer.complete();
        } catch (error) {
          this.handleError('TRANSCRIPTION_FAILED', error);
          observer.error(error);
        }
      };
      reader.onerror = (error) => observer.error(error);
      reader.readAsDataURL(audioBlob);
    });
  }

  // ==================== IMAGE GENERATION (Gemini) ====================

  /**
   * Generate image description/prompt enhancement using Gemini
   * Note: Gemini doesn't generate images directly, but can enhance prompts
   * For actual image generation, consider using Imagen API
   */
  generateImage(request: ImageGenerationRequest): Observable<ImageGenerationResponse> {
    // Gemini can enhance the prompt for better image generation
    const enhancePrompt = `
      Enhance this image prompt for a children's educational application.
      Make it more descriptive and suitable for children with disabilities.
      Original prompt: "${request.prompt}"
      Return only the enhanced prompt, nothing else.
    `;

    return this.generateText({ prompt: enhancePrompt }).pipe(
      map(enhancedPrompt => ({
        url: '', // Would need actual image generation service
        revisedPrompt: enhancedPrompt
      }))
    );
  }

  // ==================== GRAMMAR ANALYSIS (Compromise + Gemini) ====================

  /**
   * Analyze grammar using Compromise.js library
   * Replaces: Ollama grammar analysis
   */
  analyzeGrammar(text: string): Observable<GrammarAnalysisResponse> {
    return of(text).pipe(
      map(inputText => {
        const doc = nlp(inputText);
        const words: GrammarWord[] = [];

        // Extract parts of speech
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

          words.push({
            word,
            type,
            color: GRAMMAR_COLORS[type]
          });
        });

        // Extract sentences
        const sentences = doc.sentences().out('array') as string[];

        // Calculate summary
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

  /**
   * Get AI-powered grammar explanation
   */
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

  /**
   * Generate educational content for children
   * Replaces: GPT-4 educational prompts
   */
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

      // Select a default English female voice for children
      this.selectedVoice = this.voices.find(v =>
        v.lang.startsWith('en') && /female|woman|girl/i.test(v.name)
      ) || this.voices.find(v => v.lang.startsWith('en')) || null;
    };

    // Voices may be loaded asynchronously
    if (this.speechSynthesis.onvoiceschanged !== undefined) {
      this.speechSynthesis.onvoiceschanged = loadVoicesInternal;
    }

    // Also try loading immediately
    setTimeout(loadVoicesInternal, 100);
  }

  private handleError(code: string, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.stateSubject.next('error');
    this.errorSubject.next({ code, message, details: error });
    console.error(`[UnifiedAIService] ${code}:`, error);
  }

  /**
   * Check if Gemini API is available
   */
  isAvailable(): Observable<boolean> {
    return this.generateText({ prompt: 'test' }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Get current service state
   */
  getState(): AIServiceState {
    return this.stateSubject.value;
  }
}
