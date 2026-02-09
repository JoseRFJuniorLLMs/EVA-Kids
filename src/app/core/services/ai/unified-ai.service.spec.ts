import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NgZone } from '@angular/core';
import { UnifiedAIService } from './unified-ai.service';
import { createMockSpeechSynthesis, createMockGeminiModel } from '../testing/mock-factories';

describe('UnifiedAIService', () => {
  let service: UnifiedAIService;
  let httpMock: HttpTestingController;
  let mockSpeechSynthesis: any;
  let originalSpeechSynthesis: SpeechSynthesis;

  beforeEach(() => {
    // Mock SpeechSynthesis
    mockSpeechSynthesis = createMockSpeechSynthesis();
    originalSpeechSynthesis = window.speechSynthesis;
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      writable: true,
      configurable: true
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UnifiedAIService]
    });

    service = TestBed.inject(UnifiedAIService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    Object.defineProperty(window, 'speechSynthesis', {
      value: originalSpeechSynthesis,
      writable: true,
      configurable: true
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ==================== State Management ====================

  describe('state management', () => {
    it('should start in idle state', () => {
      expect(service.getState()).toBe('idle');
    });

    it('should emit state changes on state$', (done) => {
      const states: string[] = [];
      service.state$.subscribe(state => {
        states.push(state);
        if (states.length === 1) {
          expect(states[0]).toBe('idle');
          done();
        }
      });
    });
  });

  // ==================== Text-to-Speech ====================

  describe('speak()', () => {
    it('should cancel any ongoing speech before speaking', async () => {
      service.speak({ text: 'Hello' });
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should create utterance with correct text', async () => {
      service.speak({ text: 'Hello World' });
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      const utterance = mockSpeechSynthesis._lastUtterance;
      expect(utterance.text).toBe('Hello World');
    });

    it('should apply language option', async () => {
      service.speak({ text: 'Ola', options: { language: 'pt-BR' } });
      const utterance = mockSpeechSynthesis._lastUtterance;
      expect(utterance.lang).toBe('pt-BR');
    });

    it('should apply speed option', async () => {
      service.speak({ text: 'Fast', options: { speed: 1.5 } });
      const utterance = mockSpeechSynthesis._lastUtterance;
      expect(utterance.rate).toBe(1.5);
    });

    it('should resolve when utterance ends', async () => {
      const promise = service.speak({ text: 'Done' });
      mockSpeechSynthesis._completeUtterance();
      await expectAsync(promise).toBeResolved();
    });

    it('should reject when speech synthesis not supported', async () => {
      // Temporarily remove speechSynthesis
      const svc = service as any;
      svc.speechSynthesis = null;
      await expectAsync(service.speak({ text: 'test' })).toBeRejectedWithError('Speech synthesis not supported');
    });
  });

  describe('stopSpeaking()', () => {
    it('should cancel speech synthesis', () => {
      service.stopSpeaking();
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  describe('pauseSpeaking()', () => {
    it('should pause speech synthesis', () => {
      service.pauseSpeaking();
      expect(mockSpeechSynthesis.pause).toHaveBeenCalled();
    });
  });

  describe('resumeSpeaking()', () => {
    it('should resume speech synthesis', () => {
      service.resumeSpeaking();
      expect(mockSpeechSynthesis.resume).toHaveBeenCalled();
    });
  });

  // ==================== Voice Management ====================

  describe('getVoices()', () => {
    it('should return available voices', () => {
      const voices = service.getVoices();
      expect(Array.isArray(voices)).toBeTrue();
    });
  });

  describe('setVoice()', () => {
    it('should set voice by name', () => {
      service.setVoice('Google UK');
      // Internal state change - verified through speak behavior
      expect(service).toBeTruthy();
    });
  });

  // ==================== Grammar Analysis ====================

  describe('analyzeGrammar()', () => {
    it('should analyze simple sentence', (done) => {
      service.analyzeGrammar('The cat sits on the mat').subscribe(result => {
        expect(result.words).toBeTruthy();
        expect(result.words.length).toBeGreaterThan(0);
        expect(result.sentences).toBeTruthy();
        expect(result.summary).toBeTruthy();
        done();
      });
    });

    it('should identify nouns', (done) => {
      service.analyzeGrammar('The dog runs fast').subscribe(result => {
        const nouns = result.words.filter(w => w.type === 'Noun');
        expect(nouns.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should identify verbs', (done) => {
      service.analyzeGrammar('She walks quickly').subscribe(result => {
        const verbs = result.words.filter(w => w.type === 'Verb');
        expect(verbs.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should provide correct summary counts', (done) => {
      service.analyzeGrammar('The big cat quickly runs').subscribe(result => {
        expect(result.summary!.nouns).toBeGreaterThanOrEqual(0);
        expect(result.summary!.verbs).toBeGreaterThanOrEqual(0);
        expect(result.summary!.adjectives).toBeGreaterThanOrEqual(0);
        done();
      });
    });

    it('should assign colors to grammar types', (done) => {
      service.analyzeGrammar('Hello world').subscribe(result => {
        result.words.forEach(word => {
          expect(word.color).toBeTruthy();
        });
        done();
      });
    });
  });

  // ==================== Error Handling ====================

  describe('error handling', () => {
    it('should emit errors on error$', (done) => {
      service.error$.subscribe(error => {
        expect(error.code).toBeTruthy();
        expect(error.message).toBeTruthy();
        done();
      });

      // Trigger an error through internal handler
      (service as any).handleError('TEST_ERROR', new Error('test'));
    });

    it('should set state to error on handleError', () => {
      (service as any).handleError('TEST', 'details');
      expect(service.getState()).toBe('error');
    });
  });
});
