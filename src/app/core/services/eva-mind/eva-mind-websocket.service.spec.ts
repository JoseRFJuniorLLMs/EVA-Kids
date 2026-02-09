import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EVAMindWebSocketService } from './eva-mind-websocket.service';
import { createMockWebSocket, createMockAudioContext, createMockMediaStream } from '../testing/mock-factories';

describe('EVAMindWebSocketService', () => {
  let service: EVAMindWebSocketService;
  let mockWebSocket: any;
  let mockAudioContext: any;
  let mockMediaStream: any;
  let originalWebSocket: typeof WebSocket;
  let originalAudioContext: typeof AudioContext;

  beforeEach(() => {
    // Mock WebSocket
    mockWebSocket = createMockWebSocket();
    originalWebSocket = (window as any).WebSocket;
    (window as any).WebSocket = function() {
      return mockWebSocket;
    };
    // Keep OPEN/CLOSED constants
    (window as any).WebSocket.OPEN = WebSocket.OPEN;
    (window as any).WebSocket.CLOSED = WebSocket.CLOSED;

    // Mock AudioContext
    mockAudioContext = createMockAudioContext();
    originalAudioContext = (window as any).AudioContext;
    (window as any).AudioContext = function() {
      return mockAudioContext;
    };

    // Mock getUserMedia
    mockMediaStream = createMockMediaStream();
    spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(
      Promise.resolve(mockMediaStream as any)
    );

    TestBed.configureTestingModule({
      providers: [EVAMindWebSocketService]
    });

    service = TestBed.inject(EVAMindWebSocketService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    (window as any).WebSocket = originalWebSocket;
    (window as any).AudioContext = originalAudioContext;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ==================== State ====================

  describe('initial state', () => {
    it('should start in idle state', () => {
      expect(service.currentState).toBe('idle');
    });

    it('should emit idle on state$', (done) => {
      service.state$.subscribe(state => {
        expect(state).toBe('idle');
        done();
      });
    });
  });

  // ==================== Connect ====================

  describe('connect()', () => {
    it('should transition to connecting state', fakeAsync(() => {
      const states: string[] = [];
      service.state$.subscribe(s => states.push(s));

      service.connect('12345678901');
      tick();

      expect(states).toContain('connecting');
    }));

    it('should initialize audio context', fakeAsync(() => {
      service.connect('12345678901');
      tick();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    }));

    it('should not connect if already connected', fakeAsync(() => {
      service.connect('12345678901');
      tick();
      mockWebSocket._fireOpen();
      tick(600);

      // State should be registered or active, not idle
      const currentState = service.currentState;
      expect(['registered', 'active']).toContain(currentState);

      // Calling connect again should be a no-op
      service.connect('12345678901');
      tick();
    }));

    it('should handle connection errors', fakeAsync(() => {
      // Mock getUserMedia to fail
      (navigator.mediaDevices.getUserMedia as jasmine.Spy).and.returnValue(
        Promise.reject(new Error('Permission denied'))
      );

      service.connect('12345678901');
      tick();

      expect(service.currentState).toBe('error');
    }));
  });

  // ==================== WebSocket Messages ====================

  describe('WebSocket messages', () => {
    beforeEach(fakeAsync(() => {
      service.connect('12345678901');
      tick();
      mockWebSocket._fireOpen();
      tick(600);
    }));

    it('should send register message on open', () => {
      expect(mockWebSocket.send).toHaveBeenCalled();
      const firstCall = mockWebSocket.send.calls.first().args[0];
      const msg = JSON.parse(firstCall);
      expect(msg.type).toBe('register');
      expect(msg.cpf).toBe('12345678901');
    });

    it('should handle transcript messages', (done) => {
      service.transcript$.subscribe(text => {
        if (text === 'hello EVA') {
          done();
        }
      });

      const msg = JSON.stringify({
        type: 'inputAudioTranscription',
        payload: 'hello EVA'
      });
      mockWebSocket._fireMessage(msg);
    });

    it('should handle AI response messages', (done) => {
      service.aiResponse$.subscribe(text => {
        if (text === 'Hi there!') {
          done();
        }
      });

      const msg = JSON.stringify({
        serverContent: {
          audioTranscription: { text: 'Hi there!' }
        }
      });
      mockWebSocket._fireMessage(msg);
    });

    it('should handle serverContent.inputAudioTranscription', (done) => {
      service.transcript$.subscribe(text => {
        if (text === 'spoken text') {
          done();
        }
      });

      const msg = JSON.stringify({
        serverContent: {
          inputAudioTranscription: { text: 'spoken text' }
        }
      });
      mockWebSocket._fireMessage(msg);
    });

    it('should handle error messages', (done) => {
      service.error$.subscribe(error => {
        if (error === 'Something went wrong') {
          done();
        }
      });

      const msg = JSON.stringify({
        type: 'error',
        error: 'Something went wrong'
      });
      mockWebSocket._fireMessage(msg);
    });

    it('should transition to speaking on audio_start', fakeAsync(() => {
      const msg = JSON.stringify({ type: 'audio_start' });
      mockWebSocket._fireMessage(msg);
      tick();
      expect(service.currentState).toBe('speaking');
    }));

    it('should transition to active on audio_end', fakeAsync(() => {
      const startMsg = JSON.stringify({ type: 'audio_start' });
      mockWebSocket._fireMessage(startMsg);
      tick();

      const endMsg = JSON.stringify({ type: 'audio_end' });
      mockWebSocket._fireMessage(endMsg);
      tick();

      expect(service.currentState).toBe('active');
    }));

    it('should handle binary audio data', fakeAsync(() => {
      // Send binary PCM audio data
      const pcmData = new Int16Array([1000, 2000, -1000, -2000]);
      mockWebSocket._fireMessage(pcmData.buffer);
      tick();

      expect(service.currentState).toBe('speaking');
    }));

    it('should ignore non-JSON string messages gracefully', () => {
      expect(() => {
        mockWebSocket._fireMessage('not valid json {{');
      }).not.toThrow();
    });
  });

  // ==================== Hangup ====================

  describe('hangup()', () => {
    beforeEach(fakeAsync(() => {
      service.connect('12345678901');
      tick();
      mockWebSocket._fireOpen();
      tick(600);
    }));

    it('should send hangup message', () => {
      service.hangup();
      const calls = mockWebSocket.send.calls.allArgs();
      const hangupCall = calls.find((args: any[]) => {
        try { return JSON.parse(args[0]).type === 'hangup'; } catch { return false; }
      });
      expect(hangupCall).toBeTruthy();
    });

    it('should return to idle state', () => {
      service.hangup();
      expect(service.currentState).toBe('idle');
    });

    it('should clear transcript and response', (done) => {
      service.hangup();
      service.transcript$.subscribe(t => {
        expect(t).toBe('');
        done();
      });
    });

    it('should cleanup audio resources', () => {
      service.hangup();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should close WebSocket', () => {
      service.hangup();
      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  // ==================== Audio Level ====================

  describe('audio level', () => {
    it('should emit audio level on audioLevel$', (done) => {
      service.audioLevel$.subscribe(level => {
        expect(typeof level).toBe('number');
        done();
      });
    });
  });

  // ==================== WebSocket Error/Close ====================

  describe('WebSocket error/close', () => {
    beforeEach(fakeAsync(() => {
      service.connect('12345678901');
      tick();
      mockWebSocket._fireOpen();
      tick(600);
    }));

    it('should handle WebSocket error', fakeAsync(() => {
      mockWebSocket._fireError();
      tick();
      expect(service.currentState).toBe('error');
    }));

    it('should handle WebSocket close', fakeAsync(() => {
      mockWebSocket._fireClose();
      tick();
      expect(service.currentState).toBe('idle');
    }));

    it('should emit error message on WebSocket error', (done) => {
      service.error$.subscribe(error => {
        if (error === 'Erro na conexao WebSocket') {
          done();
        }
      });
      mockWebSocket._fireError();
    });
  });

  // ==================== Cleanup ====================

  describe('ngOnDestroy()', () => {
    it('should cleanup on destroy', () => {
      service.ngOnDestroy();
      expect(service.currentState).toBe('idle');
    });
  });
});
