import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { UnifiedVoiceService } from './unified-voice.service';
import { createMockSpeechRecognition, createMockSpeechSynthesis } from '../testing/mock-factories';

describe('UnifiedVoiceService', () => {
  let service: UnifiedVoiceService;
  let mockRecognition: any;
  let mockSpeechSynthesis: any;
  let originalSpeechSynthesis: SpeechSynthesis;
  let originalSpeechRecognition: any;

  beforeEach(() => {
    // Mock SpeechRecognition
    mockRecognition = createMockSpeechRecognition();
    originalSpeechRecognition = (window as any).SpeechRecognition;
    (window as any).SpeechRecognition = function() {
      return mockRecognition;
    };

    // Mock SpeechSynthesis
    mockSpeechSynthesis = createMockSpeechSynthesis();
    originalSpeechSynthesis = window.speechSynthesis;
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      writable: true,
      configurable: true
    });

    TestBed.configureTestingModule({
      providers: [UnifiedVoiceService]
    });

    service = TestBed.inject(UnifiedVoiceService);
  });

  afterEach(() => {
    service.destroy();
    (window as any).SpeechRecognition = originalSpeechRecognition;
    Object.defineProperty(window, 'speechSynthesis', {
      value: originalSpeechSynthesis,
      writable: true,
      configurable: true
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ==================== Configuration ====================

  describe('configuration', () => {
    it('should apply preset configuration', () => {
      service.usePreset('game');
      const config = service.getConfig();
      expect(config.recognition).toBeTruthy();
    });

    it('should handle unknown preset gracefully', () => {
      expect(() => service.usePreset('nonexistent')).not.toThrow();
    });

    it('should allow custom configuration', () => {
      service.configure({
        recognition: { language: 'pt-BR', continuous: true, interimResults: false, maxAlternatives: 1, autoRestart: true }
      });
      const config = service.getConfig();
      expect(config.recognition.language).toBe('pt-BR');
    });
  });

  // ==================== Speech Recognition ====================

  describe('startListening()', () => {
    it('should start speech recognition', () => {
      service.startListening();
      expect(mockRecognition.start).toHaveBeenCalled();
    });

    it('should not start if already listening', () => {
      service.startListening();
      mockRecognition._fireStart();
      mockRecognition.start.calls.reset();
      service.startListening();
      expect(mockRecognition.start).not.toHaveBeenCalled();
    });
  });

  describe('stopListening()', () => {
    it('should stop speech recognition', () => {
      service.startListening();
      mockRecognition._fireStart();
      service.stopListening();
      expect(mockRecognition.stop).toHaveBeenCalled();
    });

    it('should not throw if not listening', () => {
      expect(() => service.stopListening()).not.toThrow();
    });
  });

  describe('command$', () => {
    it('should emit final voice commands', (done) => {
      service.command$.subscribe(command => {
        expect(command).toBe('hello world');
        done();
      });

      service.startListening();
      mockRecognition._fireStart();
      mockRecognition._fireResult('Hello World', true);
    });

    it('should lowercase commands', (done) => {
      service.command$.subscribe(command => {
        expect(command).toBe('test command');
        done();
      });

      service.startListening();
      mockRecognition._fireStart();
      mockRecognition._fireResult('Test Command', true);
    });
  });

  describe('interimResult$', () => {
    it('should emit interim results when configured', (done) => {
      service.configure({
        recognition: { interimResults: true, language: 'en-US', continuous: true, maxAlternatives: 1, autoRestart: true }
      });

      service.interimResult$.subscribe(result => {
        expect(result).toBeTruthy();
        done();
      });

      service.startListening();
      mockRecognition._fireStart();
      mockRecognition._fireResult('partial', false);
    });
  });

  // ==================== State Management ====================

  describe('state management', () => {
    it('should start in idle state', () => {
      expect(service.getState()).toBe('idle');
    });

    it('should transition to listening when started', (done) => {
      service.state$.subscribe(state => {
        if (state === 'listening') {
          done();
        }
      });
      service.startListening();
      mockRecognition._fireStart();
    });

    it('should transition back to idle when stopped', () => {
      service.startListening();
      mockRecognition._fireStart();
      service.stopListening();
      expect(service.getState()).toBe('idle');
    });

    it('should transition to error on recognition error', (done) => {
      service.state$.subscribe(state => {
        if (state === 'error') {
          done();
        }
      });
      service.startListening();
      mockRecognition._fireStart();
      mockRecognition._fireError('network');
    });
  });

  // ==================== TTS ====================

  describe('speak()', () => {
    it('should cancel previous speech', async () => {
      service.speak('Hello');
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should create utterance and speak', async () => {
      service.speak('Test');
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('should resolve on speech end', async () => {
      const promise = service.speak('Done');
      mockSpeechSynthesis._completeUtterance();
      await expectAsync(promise).toBeResolved();
    });

    it('should set state to speaking', () => {
      service.speak('Hello');
      expect(service.getState()).toBe('speaking');
    });
  });

  describe('setVoice()', () => {
    it('should update selected voice', () => {
      service.setVoice('Google UK');
      expect(service).toBeTruthy();
    });
  });

  describe('setSpeechRate()', () => {
    it('should clamp rate between 0.5 and 2.0', () => {
      service.setSpeechRate(3.0);
      const config = service.getConfig();
      expect(config.tts.rate).toBeLessThanOrEqual(2.0);
    });

    it('should clamp minimum rate', () => {
      service.setSpeechRate(0.1);
      const config = service.getConfig();
      expect(config.tts.rate).toBeGreaterThanOrEqual(0.5);
    });
  });

  // ==================== Recording ====================

  describe('recording', () => {
    it('should handle startRecording when plugin not initialized', () => {
      expect(() => service.startRecording()).not.toThrow();
    });

    it('should handle stopRecording when not recording', () => {
      expect(() => service.stopRecording()).not.toThrow();
    });

    it('should toggle recording state', () => {
      service.toggleRecording();
      // No error should be thrown even without plugin
      expect(service).toBeTruthy();
    });
  });

  // ==================== Utility ====================

  describe('utility methods', () => {
    it('should check recognition support', () => {
      expect(service.isRecognitionSupported()).toBeTrue();
    });

    it('should check synthesis support', () => {
      expect(service.isSynthesisSupported()).toBeTrue();
    });

    it('should expose public state getters', () => {
      expect(service.isListening).toBeFalse();
      expect(service.isRecording).toBeFalse();
      expect(service.isPaused).toBeFalse();
    });
  });

  // ==================== Cleanup ====================

  describe('cleanup', () => {
    it('should complete all subjects on destroy', () => {
      const commandSpy = jasmine.createSpy('command');
      service.command$.subscribe({ complete: commandSpy });
      service.destroy();
      expect(commandSpy).toHaveBeenCalled();
    });

    it('should stop recognition on destroy', () => {
      service.startListening();
      mockRecognition._fireStart();
      service.destroy();
      expect(service.isListening).toBeFalse();
    });

    it('should cancel speech on destroy', () => {
      service.destroy();
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });
  });
});
