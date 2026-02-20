/**
 * Environment configuration - Production
 * All AI calls routed through EVA backend - no API keys in frontend
 */
export const environment = {
  production: true,

  // EVA - Main AI Backend (Go)
  eva: {
    baseUrl: 'https://eva-ia.org:8091',
    wsUrl: 'wss://eva-ia.org:8091/ws/browser',
    chatUrl: 'https://eva-ia.org:8091/api/chat',
    sampleRate: 24000,
  },

  // AI Configuration - routed through EVA
  ai: {
    provider: 'eva' as const,
    models: {
      text: 'gemini-2.5-flash',
      vision: 'gemini-2.5-flash',
    }
  },

  // EVA-Back API (data services: students, notes, auth)
  evaBack: {
    apiUrl: 'https://eva-ia.org:8000/api/v1',
    wsSignaling: 'wss://eva-ia.org:8000/api/v1/kids/ws/signaling'
  },

  // Ollama (disabled in production)
  ollama: {
    apiUrl: ''
  }
};
