/**
 * Environment configuration - Development
 * API keys should be moved to a secure backend proxy in production
 */
export const environment = {
  production: false,

  // Direct Gemini API Key for Voice Assistant
  geminiApiKey: 'AIzaSyCw01_uZBPDHQYMYbA5UgmBDz2I8v_XLag',

  // AI Configuration - GEMINI as default
  ai: {
    provider: 'gemini' as const,
    gemini: {
      apiKey: 'AIzaSyCw01_uZBPDHQYMYbA5UgmBDz2I8v_XLag',
      models: {
        text: 'gemini-1.5-flash',
        vision: 'gemini-1.5-flash',
      }
    }
  },

  // EVA-Back API (replaces Firebase)
  evaBack: {
    apiUrl: 'https://eva-ia.org:8000/api/v1',
    wsSignaling: 'wss://eva-ia.org:8000/api/v1/kids/ws/signaling'
  },

  // EVA-Mind WebSocket
  evaMind: {
    wsUrl: 'wss://eva-ia.org:8090/ws/pcm',
    sampleRate: 24000,
  },

  // Ollama (local AI for grammar analysis)
  ollama: {
    apiUrl: 'http://localhost:11434/api/generate'
  }
};
