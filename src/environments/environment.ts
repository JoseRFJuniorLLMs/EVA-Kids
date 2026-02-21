/**
 * Environment configuration - Development
 * All AI calls routed through EVA backend - no API keys in frontend
 */
export const environment = {
  production: false,

  // EVA - Main AI Backend (Go, port 8091)
  eva: {
    baseUrl: '/api/v1',
    wsUrl: 'wss://34.56.82.116/ws/browser',
    chatUrl: '/api/v1/chat',
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
    apiUrl: '/eva-back/api/v1',
    wsSignaling: 'wss://34.56.82.116/eva-back/api/v1/kids/ws/signaling'
  }
};
