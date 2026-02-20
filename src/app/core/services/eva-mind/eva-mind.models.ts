export type EVAMindState = 'idle' | 'connecting' | 'registered' | 'active' | 'speaking' | 'error';

export interface EVAMindConfig {
  wsUrl: string;
  cpf: string;
  sampleRate: number;
}

export interface EVAMindMessage {
  type: string;
  cpf?: string;
  session_id?: string;
  text?: string;
  data?: string;
  payload?: any;
  error?: string;
  success?: boolean;
  tool?: string;
  status?: string;
  tool_data?: any;
  serverContent?: {
    inputAudioTranscription?: { text: string };
    audioTranscription?: { text: string };
    inlineData?: { mimeType: string; data: string };
  };
}

export const EVA_MIND_AUDIO_CONFIG = {
  sampleRate: 24000,
  channels: 1,
  bitDepth: 16,
} as const;
