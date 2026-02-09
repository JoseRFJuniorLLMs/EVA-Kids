export interface VoiceGameConfig {
  /** Voice preset to use (default: 'game') */
  voicePreset?: string;
  /** Whether to request fullscreen on init */
  fullscreenOnInit?: boolean;
  /** Whether to setup WaveSurfer playback for recordings */
  enablePlayback?: boolean;
  /** Whether to track Satoshi rewards */
  enableSatoshi?: boolean;
  /** Student ID for Satoshi tracking */
  studentId?: string;
}

export const DEFAULT_VOICE_GAME_CONFIG: VoiceGameConfig = {
  voicePreset: 'game',
  fullscreenOnInit: true,
  enablePlayback: true,
  enableSatoshi: true,
  studentId: 'student-id'
};
