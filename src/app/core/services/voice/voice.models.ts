/**
 * Voice Service Models and Interfaces
 * Configuration types for the UnifiedVoiceService
 */

// Web Speech API Type Definitions (not included in default TypeScript lib)
declare global {
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Voice Recognition Configuration
export interface VoiceRecognitionConfig {
  continuous: boolean;        // true for games, false for single commands
  interimResults: boolean;    // true for real-time feedback
  language: string;           // 'en-GB', 'en-US', 'pt-BR'
  maxAlternatives: number;    // 1-5
  autoRestart: boolean;       // Restart on end if still listening
}

// WaveSurfer Configuration
export interface WaveSurferConfig {
  enabled: boolean;
  waveColor: string;
  progressColor: string;
  barGap: number;
  barWidth: number;
  barHeight: number;
  barRadius: number;
}

// Recording Configuration
export interface RecordingConfig {
  enabled: boolean;
  mimeType: string;           // 'audio/webm'
  scrollingWaveform: boolean;
  renderRecordedAudio: boolean;
}

// Text-to-Speech Configuration
export interface TTSConfig {
  enabled: boolean;
  voice: string | null;       // Voice name or null for auto
  language: string;
  rate: number;               // 0.5 - 2.0
  pitch: number;              // 0 - 2
  volume: number;             // 0 - 1
}

// Complete Voice Service Configuration
export interface VoiceServiceConfig {
  recognition: VoiceRecognitionConfig;
  wavesurfer: WaveSurferConfig;
  recording: RecordingConfig;
  tts: TTSConfig;
}

// Voice Service State
export type VoiceServiceState = 'idle' | 'listening' | 'recording' | 'speaking' | 'error';

// Voice Service Error
export interface VoiceServiceError {
  code: string;
  message: string;
  details?: unknown;
}

// Preset Configurations for different use cases
export const VOICE_PRESETS: Record<string, Partial<VoiceServiceConfig>> = {
  // Short aliases for components
  game: {
    recognition: {
      continuous: true,
      interimResults: true,
      language: 'en-GB',
      maxAlternatives: 3,
      autoRestart: true
    },
    wavesurfer: {
      enabled: true,
      waveColor: 'rgb(33, 150, 243)',
      progressColor: 'rgb(135, 206, 235)',
      barGap: 1,
      barWidth: 2,
      barHeight: 10,
      barRadius: 50
    },
    recording: {
      enabled: true,
      mimeType: 'audio/webm',
      scrollingWaveform: false,
      renderRecordedAudio: false
    },
    tts: {
      enabled: true,
      voice: null,
      language: 'en-GB',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  },
  book: {
    recognition: {
      continuous: false,
      interimResults: false,
      language: 'en-GB',
      maxAlternatives: 1,
      autoRestart: false
    },
    wavesurfer: {
      enabled: true,
      waveColor: 'violet',
      progressColor: 'purple',
      barGap: 1,
      barWidth: 2,
      barHeight: 10,
      barRadius: 50
    },
    recording: {
      enabled: true,
      mimeType: 'audio/webm',
      scrollingWaveform: false,
      renderRecordedAudio: false
    },
    tts: {
      enabled: true,
      voice: null,
      language: 'en-GB',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  },
  memory: {
    recognition: {
      continuous: false,
      interimResults: false,
      language: 'en-GB',
      maxAlternatives: 3,
      autoRestart: false
    },
    wavesurfer: {
      enabled: false,
      waveColor: 'rgb(33, 150, 243)',
      progressColor: 'rgb(135, 206, 235)',
      barGap: 1,
      barWidth: 2,
      barHeight: 10,
      barRadius: 50
    },
    recording: {
      enabled: false,
      mimeType: 'audio/webm',
      scrollingWaveform: false,
      renderRecordedAudio: false
    },
    tts: {
      enabled: true,
      voice: null,
      language: 'en-GB',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  },
  simple: {
    recognition: {
      continuous: false,
      interimResults: false,
      language: 'en-GB',
      maxAlternatives: 1,
      autoRestart: false
    },
    wavesurfer: {
      enabled: false,
      waveColor: 'rgb(33, 150, 243)',
      progressColor: 'rgb(135, 206, 235)',
      barGap: 1,
      barWidth: 2,
      barHeight: 10,
      barRadius: 50
    },
    recording: {
      enabled: false,
      mimeType: 'audio/webm',
      scrollingWaveform: false,
      renderRecordedAudio: false
    },
    tts: {
      enabled: true,
      voice: null,
      language: 'en-GB',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  },

  // For continuous voice games
  GAME_CONTINUOUS: {
    recognition: {
      continuous: true,
      interimResults: true,
      language: 'en-GB',
      maxAlternatives: 3,
      autoRestart: true
    },
    wavesurfer: {
      enabled: true,
      waveColor: 'rgb(33, 150, 243)',
      progressColor: 'rgb(135, 206, 235)',
      barGap: 1,
      barWidth: 2,
      barHeight: 10,
      barRadius: 50
    },
    recording: {
      enabled: true,
      mimeType: 'audio/webm',
      scrollingWaveform: false,
      renderRecordedAudio: false
    },
    tts: {
      enabled: true,
      voice: null,
      language: 'en-GB',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  },

  // For single-shot commands (memory game, dino, etc.)
  GAME_SINGLE_SHOT: {
    recognition: {
      continuous: false,
      interimResults: false,
      language: 'en-GB',
      maxAlternatives: 3,
      autoRestart: false
    },
    wavesurfer: {
      enabled: false,
      waveColor: 'rgb(33, 150, 243)',
      progressColor: 'rgb(135, 206, 235)',
      barGap: 1,
      barWidth: 2,
      barHeight: 10,
      barRadius: 50
    },
    recording: {
      enabled: false,
      mimeType: 'audio/webm',
      scrollingWaveform: false,
      renderRecordedAudio: false
    },
    tts: {
      enabled: true,
      voice: null,
      language: 'en-GB',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  },

  // For book readers
  BOOK_READER: {
    recognition: {
      continuous: false,
      interimResults: false,
      language: 'en-GB',
      maxAlternatives: 1,
      autoRestart: false
    },
    wavesurfer: {
      enabled: true,
      waveColor: 'violet',
      progressColor: 'purple',
      barGap: 1,
      barWidth: 2,
      barHeight: 10,
      barRadius: 50
    },
    recording: {
      enabled: true,
      mimeType: 'audio/webm',
      scrollingWaveform: false,
      renderRecordedAudio: false
    },
    tts: {
      enabled: true,
      voice: null,
      language: 'en-GB',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  },

  // For simple TTS only
  SIMPLE_TTS: {
    recognition: {
      continuous: false,
      interimResults: false,
      language: 'en-GB',
      maxAlternatives: 1,
      autoRestart: false
    },
    wavesurfer: {
      enabled: false,
      waveColor: 'rgb(33, 150, 243)',
      progressColor: 'rgb(135, 206, 235)',
      barGap: 1,
      barWidth: 2,
      barHeight: 10,
      barRadius: 50
    },
    recording: {
      enabled: false,
      mimeType: 'audio/webm',
      scrollingWaveform: false,
      renderRecordedAudio: false
    },
    tts: {
      enabled: true,
      voice: null,
      language: 'en-GB',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  }
};

// Default Configuration
export const DEFAULT_VOICE_CONFIG: VoiceServiceConfig = {
  recognition: {
    continuous: true,
    interimResults: true,
    language: 'en-GB',
    maxAlternatives: 3,
    autoRestart: true
  },
  wavesurfer: {
    enabled: true,
    waveColor: 'rgb(33, 150, 243)',
    progressColor: 'rgb(135, 206, 235)',
    barGap: 1,
    barWidth: 2,
    barHeight: 10,
    barRadius: 50
  },
  recording: {
    enabled: true,
    mimeType: 'audio/webm',
    scrollingWaveform: false,
    renderRecordedAudio: false
  },
  tts: {
    enabled: true,
    voice: null,
    language: 'en-GB',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  }
};
