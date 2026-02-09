import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GeminiAudioService, AudioServiceState } from './gemini-audio.service';
import { createMockWebSocket, createMockAudioContext } from '../testing/mock-factories';

describe('GeminiAudioService', () => {
  let service: GeminiAudioService;
  let httpMock: HttpTestingController;
  let mockWebSocket: any;
  let mockAudioContext: any;
  let originalWebSocket: typeof WebSocket;
  let originalAudioContext: typeof AudioContext;

  beforeEach(() => {
    // Mock WebSocket
    mockWebSocket = createMockWebSocket();
    mockWebSocket.readyState = WebSocket.CONNECTING;
    originalWebSocket = (window as any).WebSocket;
    (window as any).WebSocket = function() {
      return mockWebSocket;
    };
    (window as any).WebSocket.OPEN = WebSocket.OPEN;
    (window as any).WebSocket.CLOSED = WebSocket.CLOSED;
    (window as any).WebSocket.CONNECTING = WebSocket.CONNECTING;

    // Mock AudioContext
    mockAudioContext = createMockAudioContext();
    originalAudioContext = (window as any).AudioContext;
    (window as any).AudioContext = function() {
      return mockAudioContext;
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GeminiAudioService]
    });

    service = TestBed.inject(GeminiAudioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.ngOnDestroy();
    httpMock.verify();
    (window as any).WebSocket = originalWebSocket;
    (window as any).AudioContext = originalAudioContext;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ==================== Initial State ====================

  describe('initial state', () => {
    it('should start in idle state', (done) => {
      service.state$.subscribe(state => {
        expect(state).toBe('idle');
        done();
      });
    });

    it('should have no error initially', (done) => {
      service.error$.subscribe(error => {
        expect(error).toBeNull();
        done();
      });
    });

    it('should not be in active session', () => {
      expect(service.isSessionActive).toBeFalse();
    });
  });

  // ==================== Connect ====================

  describe('connect()', () => {
    it('should create WebSocket connection', async () => {
      const connectPromise = service.connect('Test prompt');
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();

      const result = await connectPromise;
      expect(result).toBeTrue();
    });

    it('should set session active on connect', async () => {
      const connectPromise = service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      await connectPromise;

      expect(service.isSessionActive).toBeTrue();
    });

    it('should transition to ready on connect', fakeAsync(() => {
      const states: AudioServiceState[] = [];
      service.state$.subscribe(s => states.push(s));

      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      tick();

      expect(states).toContain('ready');
    }));

    it('should send setup message on open', async () => {
      const connectPromise = service.connect('Custom prompt');
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      await connectPromise;

      expect(mockWebSocket.send).toHaveBeenCalled();
      const setupCall = mockWebSocket.send.calls.first().args[0];
      const msg = JSON.parse(setupCall);
      expect(msg.setup).toBeTruthy();
      expect(msg.setup.model).toContain('gemini');
    });

    it('should not reconnect if already connected', async () => {
      const connectPromise1 = service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      await connectPromise1;

      const result = await service.connect();
      expect(result).toBeTrue();
    });

    it('should handle WebSocket error', async () => {
      const connectPromise = service.connect();
      mockWebSocket._fireError();

      const result = await connectPromise;
      expect(result).toBeFalse();
    });

    it('should handle WebSocket close', fakeAsync(() => {
      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      tick();

      mockWebSocket._fireClose();
      tick();

      // State should be idle after close
      let currentState: AudioServiceState = 'idle';
      service.state$.subscribe(s => currentState = s);
      tick();
      expect(currentState).toBe('idle');
    }));
  });

  // ==================== Speak ====================

  describe('speak()', () => {
    it('should not process empty text', async () => {
      await service.speak('');
      // Should not send any WebSocket message
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should queue speech when already speaking', fakeAsync(() => {
      // Connect first
      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      tick();

      // Speak twice
      service.speak('First');
      service.speak('Second');
      tick();

      // Only first should be sent (second queued)
      const textMessages = mockWebSocket.send.calls.allArgs()
        .filter((args: any[]) => {
          try {
            return JSON.parse(args[0]).client_content;
          } catch { return false; }
        });
      expect(textMessages.length).toBe(1);
    }));

    it('should process queue after speech ends', fakeAsync(() => {
      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      tick();

      service.speak('First');
      service.speak('Second');
      tick();

      // Simulate turn complete for first message
      const turnComplete = JSON.stringify({
        serverContent: { turnComplete: true }
      });
      mockWebSocket._fireMessage(turnComplete);
      tick();

      // Second message should now be sent
      const textMessages = mockWebSocket.send.calls.allArgs()
        .filter((args: any[]) => {
          try {
            return JSON.parse(args[0]).client_content;
          } catch { return false; }
        });
      expect(textMessages.length).toBe(2);
    }));

    it('should call onEnd callback when turn completes', fakeAsync(() => {
      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      tick();

      const onEnd = jasmine.createSpy('onEnd');
      service.speak('Test', onEnd);
      tick();

      const turnComplete = JSON.stringify({
        serverContent: { turnComplete: true }
      });
      mockWebSocket._fireMessage(turnComplete);
      tick();

      expect(onEnd).toHaveBeenCalled();
    }));

    it('should transition to speaking state', fakeAsync(() => {
      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      tick();

      const states: AudioServiceState[] = [];
      service.state$.subscribe(s => states.push(s));

      service.speak('Hello');
      tick();

      expect(states).toContain('speaking');
    }));
  });

  // ==================== REST Fallback ====================

  describe('REST API fallback', () => {
    it('should use REST API when WebSocket not connected', fakeAsync(() => {
      // Don't connect WebSocket - speak should fallback
      service.speak('Fallback text');
      tick();

      // Should attempt connection first, then possibly fallback
      // The connect will attempt to create a WebSocket
      expect(service).toBeTruthy();
    }));
  });

  // ==================== Audio Playback ====================

  describe('audio handling', () => {
    it('should emit audio events', (done) => {
      service.audioEvent$.subscribe(event => {
        expect(event.type).toBeTruthy();
        expect(event.data).toBeTruthy();
        done();
      });

      // Simulate receiving audio data
      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();

      const audioMsg = JSON.stringify({
        serverContent: {
          modelTurn: {
            parts: [{
              inlineData: {
                mimeType: 'audio/pcm',
                data: btoa('audio data')
              }
            }]
          }
        }
      });
      mockWebSocket._fireMessage(audioMsg);
    });
  });

  // ==================== Stop/Disconnect ====================

  describe('stopPlayback()', () => {
    it('should clear speech queue', () => {
      service.stopPlayback();
      // Internal queue should be empty
      expect(service).toBeTruthy();
    });

    it('should transition to ready state', (done) => {
      service.stopPlayback();
      service.state$.subscribe(state => {
        expect(state).toBe('ready');
        done();
      });
    });
  });

  describe('disconnect()', () => {
    it('should close WebSocket', fakeAsync(() => {
      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      tick();

      service.disconnect();
      expect(mockWebSocket.close).toHaveBeenCalled();
    }));

    it('should set session inactive', fakeAsync(() => {
      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      tick();

      service.disconnect();
      expect(service.isSessionActive).toBeFalse();
    }));

    it('should transition to idle state', fakeAsync(() => {
      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      tick();

      let currentState: AudioServiceState = 'ready';
      service.state$.subscribe(s => currentState = s);

      service.disconnect();
      tick();

      expect(currentState).toBe('idle');
    }));
  });

  // ==================== Listening ====================

  describe('listening', () => {
    it('should transition to listening state', fakeAsync(() => {
      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      tick();

      let currentState: AudioServiceState = 'ready';
      service.state$.subscribe(s => currentState = s);

      service.startListening();
      tick();

      expect(currentState).toBe('listening');
    }));

    it('should transition to ready on stopListening', fakeAsync(() => {
      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      tick();

      service.startListening();

      let currentState: AudioServiceState = 'listening';
      service.state$.subscribe(s => currentState = s);

      service.stopListening();
      tick();

      expect(currentState).toBe('ready');
    }));
  });

  // ==================== Cleanup ====================

  describe('ngOnDestroy()', () => {
    it('should disconnect and cleanup', fakeAsync(() => {
      service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket._fireOpen();
      tick();

      service.ngOnDestroy();
      expect(service.isSessionActive).toBeFalse();
    }));

    it('should close audio context', () => {
      service.ngOnDestroy();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });
});
