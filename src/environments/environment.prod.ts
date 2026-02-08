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
      apiKey: '', // Load from environment variable: process.env.GEMINI_API_KEY
      models: {
        text: 'gemini-1.5-flash',
        vision: 'gemini-1.5-flash',
      }
    }
  },

  // Firebase Configuration
  firebase: {
    apiKey: '', // Load from environment variable
    authDomain: 'priming-ai-7.firebaseapp.com',
    projectId: 'priming-ai-7',
    storageBucket: 'priming-ai-7.appspot.com',
    messagingSenderId: '',
    appId: ''
  },

  // API URLs
  api: {
    baseUrl: 'https://priming-1532995a3138.herokuapp.com'
  }
};
