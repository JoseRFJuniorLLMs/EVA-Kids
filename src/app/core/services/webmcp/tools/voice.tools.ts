/**
 * WebMCP Tools - Voice (EVA-Kids)
 */

import { UnifiedVoiceService } from '../../voice/unified-voice.service';
import type { WebMCPTool } from '../webmcp-adapter.service';

export function createVoiceTools(voice: UnifiedVoiceService): WebMCPTool[] {
  return [
    {
      name: 'voice_speak',
      description: 'Sintetiza texto em fala usando o navegador (Text-to-Speech).',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto para falar' },
        },
        required: ['text'],
      },
      execute: async (args) => {
        await voice.speak(args['text'] as string);
        return { success: true, spoken: args['text'] };
      },
    },
    {
      name: 'voice_start_listening',
      description: 'Inicia reconhecimento de voz (Speech-to-Text). Os resultados são emitidos via command$.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        voice.startListening();
        return { success: true, listening: true };
      },
    },
    {
      name: 'voice_stop_listening',
      description: 'Para o reconhecimento de voz.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        voice.stopListening();
        return { success: true, listening: false };
      },
    },
    {
      name: 'voice_start_recording',
      description: 'Inicia gravação de áudio com WaveSurfer.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        voice.startRecording();
        return { success: true, recording: true };
      },
    },
    {
      name: 'voice_stop_recording',
      description: 'Para a gravação de áudio. Retorna URL do blob gravado.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        voice.stopRecording();
        return { success: true, recordedUrl: voice.recordedUrl };
      },
    },
    {
      name: 'voice_use_preset',
      description: 'Aplica um preset de voz (game, book, memory, simple, GAME_CONTINUOUS, GAME_SINGLE_SHOT, BOOK_READER, SIMPLE_TTS).',
      inputSchema: {
        type: 'object',
        properties: {
          preset: { type: 'string', description: 'Nome do preset' },
        },
        required: ['preset'],
      },
      execute: async (args) => {
        voice.usePreset(args['preset'] as string);
        return { success: true, preset: args['preset'] };
      },
    },
    {
      name: 'voice_set_voice',
      description: 'Define a voz TTS pelo nome.',
      inputSchema: {
        type: 'object',
        properties: {
          voice_name: { type: 'string', description: 'Nome da voz' },
        },
        required: ['voice_name'],
      },
      execute: async (args) => {
        voice.setVoice(args['voice_name'] as string);
        return { success: true, voice: args['voice_name'] };
      },
    },
    {
      name: 'voice_get_available_voices',
      description: 'Lista todas as vozes TTS disponíveis no navegador.',
      inputSchema: { type: 'object', properties: {} },
      readOnly: true,
      execute: async () => {
        const voices = voice.getVoices();
        return voices.map(v => ({ name: v.name, lang: v.lang, default: v.default }));
      },
    },
    {
      name: 'voice_get_state',
      description: 'Retorna o estado atual do serviço de voz.',
      inputSchema: { type: 'object', properties: {} },
      readOnly: true,
      execute: async () => {
        return {
          state: voice.getState(),
          isListening: voice.isListening,
          isRecording: voice.isRecording,
          supported: {
            recognition: voice.isRecognitionSupported(),
            synthesis: voice.isSynthesisSupported(),
          },
        };
      },
    },
  ];
}
