/**
 * Environment configuration - Production
 * API keys should be loaded from environment variables or secure vault
 */
export const environment = {
  production: true,

  // AI Configuration - GEMINI as default
  ai: {
    provider: 'gemini' as const,
    gemini: {
      apiKey: '',
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

  // API URLs
  api: {
    baseUrl: 'https://priming-1532995a3138.herokuapp.com'
  }
};
