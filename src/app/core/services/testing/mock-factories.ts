/**
 * Mock Factories for Core Service Tests
 * Provides reusable mocks for browser APIs and external dependencies
 */

// ==================== Speech Recognition ====================

export function createMockSpeechRecognition() {
  const mock: any = {
    continuous: false,
    interimResults: false,
    lang: 'en-US',
    maxAlternatives: 1,
    onstart: null,
    onresult: null,
    onerror: null,
    onend: null,
    start: jasmine.createSpy('start'),
    stop: jasmine.createSpy('stop'),
    abort: jasmine.createSpy('abort'),

    // Helpers for testing
    _fireStart() {
      if (this.onstart) this.onstart(new Event('start'));
    },
    _fireResult(transcript: string, isFinal = true) {
      const event = {
        results: {
          length: 1,
          0: {
            isFinal,
            0: { transcript, confidence: 0.95 },
            length: 1
          }
        }
      };
      if (this.onresult) this.onresult(event as any);
    },
    _fireError(error: string) {
      if (this.onerror) this.onerror({ error, message: error } as any);
    },
    _fireEnd() {
      if (this.onend) this.onend(new Event('end'));
    }
  };

  return mock;
}

// ==================== Speech Synthesis ====================

export function createMockSpeechSynthesis() {
  const mock: any = {
    speaking: false,
    paused: false,
    pending: false,
    onvoiceschanged: null,
    _lastUtterance: null as SpeechSynthesisUtterance | null,

    getVoices: jasmine.createSpy('getVoices').and.returnValue([
      { name: 'Google UK English Female', lang: 'en-GB', default: false, localService: true, voiceURI: 'Google UK English Female' },
      { name: 'Google US English', lang: 'en-US', default: true, localService: true, voiceURI: 'Google US English' }
    ]),
    speak: jasmine.createSpy('speak').and.callFake(function(this: any, utterance: SpeechSynthesisUtterance) {
      this._lastUtterance = utterance;
      this.speaking = true;
    }),
    cancel: jasmine.createSpy('cancel').and.callFake(function(this: any) {
      this.speaking = false;
    }),
    pause: jasmine.createSpy('pause').and.callFake(function(this: any) {
      this.paused = true;
    }),
    resume: jasmine.createSpy('resume').and.callFake(function(this: any) {
      this.paused = false;
    }),

    // Helpers
    _completeUtterance() {
      if (this._lastUtterance?.onend) {
        this._lastUtterance.onend(new Event('end') as SpeechSynthesisEvent);
      }
      this.speaking = false;
    },
    _errorUtterance(error = 'synthesis-error') {
      if (this._lastUtterance?.onerror) {
        this._lastUtterance.onerror({ error } as any);
      }
      this.speaking = false;
    }
  };

  return mock;
}

// ==================== AudioContext ====================

export function createMockAudioContext() {
  const mockAnalyser = {
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jasmine.createSpy('getByteFrequencyData').and.callFake((arr: Uint8Array) => {
      arr.fill(128);
    }),
    connect: jasmine.createSpy('connect'),
    disconnect: jasmine.createSpy('disconnect')
  };

  const mockSource = {
    connect: jasmine.createSpy('connect'),
    disconnect: jasmine.createSpy('disconnect')
  };

  const mockWorkletNode = {
    port: {
      onmessage: null as any,
      postMessage: jasmine.createSpy('postMessage')
    },
    connect: jasmine.createSpy('connect'),
    disconnect: jasmine.createSpy('disconnect')
  };

  const mockBufferSource = {
    buffer: null as AudioBuffer | null,
    connect: jasmine.createSpy('connect'),
    start: jasmine.createSpy('start'),
    onended: null as any
  };

  const mock: any = {
    sampleRate: 24000,
    currentTime: 0,
    destination: {},
    state: 'running',

    createAnalyser: jasmine.createSpy('createAnalyser').and.returnValue(mockAnalyser),
    createMediaStreamSource: jasmine.createSpy('createMediaStreamSource').and.returnValue(mockSource),
    createBufferSource: jasmine.createSpy('createBufferSource').and.returnValue(mockBufferSource),
    createBuffer: jasmine.createSpy('createBuffer').and.callFake((channels: number, length: number, sampleRate: number) => ({
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: jasmine.createSpy('getChannelData').and.returnValue(new Float32Array(length))
    })),
    close: jasmine.createSpy('close').and.returnValue(Promise.resolve()),

    audioWorklet: {
      addModule: jasmine.createSpy('addModule').and.returnValue(Promise.resolve())
    },

    // Expose internal mocks for assertions
    _mockAnalyser: mockAnalyser,
    _mockSource: mockSource,
    _mockWorkletNode: mockWorkletNode,
    _mockBufferSource: mockBufferSource
  };

  return mock;
}

// ==================== WebSocket ====================

export function createMockWebSocket() {
  const mock: any = {
    readyState: WebSocket.OPEN,
    binaryType: 'blob',
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,

    send: jasmine.createSpy('send'),
    close: jasmine.createSpy('close').and.callFake(function(this: any) {
      this.readyState = WebSocket.CLOSED;
    }),

    // Helpers
    _fireOpen() {
      if (this.onopen) this.onopen(new Event('open'));
    },
    _fireMessage(data: string | ArrayBuffer) {
      if (this.onmessage) this.onmessage({ data } as MessageEvent);
    },
    _fireError() {
      if (this.onerror) this.onerror(new Event('error'));
    },
    _fireClose() {
      this.readyState = WebSocket.CLOSED;
      if (this.onclose) this.onclose(new CloseEvent('close'));
    }
  };

  return mock;
}

// ==================== WaveSurfer ====================

export function createMockWaveSurfer() {
  const mockRecordPlugin: any = {
    isRecording: jasmine.createSpy('isRecording').and.returnValue(false),
    isPaused: jasmine.createSpy('isPaused').and.returnValue(false),
    startRecording: jasmine.createSpy('startRecording').and.returnValue(Promise.resolve()),
    stopRecording: jasmine.createSpy('stopRecording'),
    pauseRecording: jasmine.createSpy('pauseRecording'),
    resumeRecording: jasmine.createSpy('resumeRecording'),
    on: jasmine.createSpy('on'),

    _fireRecordEnd(blob: Blob) {
      const handlers = (this.on as jasmine.Spy).calls.allArgs()
        .filter((args: any[]) => args[0] === 'record-end');
      handlers.forEach((args: any[]) => args[1](blob));
    }
  };

  const mock: any = {
    registerPlugin: jasmine.createSpy('registerPlugin').and.returnValue(mockRecordPlugin),
    create: jasmine.createSpy('create'),
    load: jasmine.createSpy('load'),
    play: jasmine.createSpy('play'),
    pause: jasmine.createSpy('pause'),
    destroy: jasmine.createSpy('destroy'),
    isPlaying: jasmine.createSpy('isPlaying').and.returnValue(false),
    on: jasmine.createSpy('on'),

    _mockRecordPlugin: mockRecordPlugin
  };

  return mock;
}

// ==================== Gemini Model ====================

export function createMockGeminiModel() {
  return {
    generateContent: jasmine.createSpy('generateContent').and.returnValue(Promise.resolve({
      response: {
        text: jasmine.createSpy('text').and.returnValue('Mock Gemini response')
      }
    })),
    generateContentStream: jasmine.createSpy('generateContentStream').and.returnValue(Promise.resolve({
      stream: (async function* () {
        yield { text: () => 'Streamed ' };
        yield { text: () => 'response' };
      })()
    }))
  };
}

// ==================== MediaStream ====================

export function createMockMediaStream() {
  return {
    getTracks: jasmine.createSpy('getTracks').and.returnValue([
      {
        kind: 'audio',
        enabled: true,
        stop: jasmine.createSpy('stop')
      }
    ]),
    getAudioTracks: jasmine.createSpy('getAudioTracks').and.returnValue([
      {
        kind: 'audio',
        enabled: true,
        stop: jasmine.createSpy('stop')
      }
    ]),
    getVideoTracks: jasmine.createSpy('getVideoTracks').and.returnValue([])
  };
}
