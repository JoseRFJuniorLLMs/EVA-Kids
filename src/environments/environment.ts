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
    provider: 'gemini' as const, // 'gemini' | 'browser'
    gemini: {
      apiKey: 'AIzaSyCw01_uZBPDHQYMYbA5UgmBDz2I8v_XLag', // Move to env variable in production
      models: {
        text: 'gemini-1.5-flash',
        vision: 'gemini-1.5-flash',
        // For TTS/STT, Gemini uses different approach - we'll use browser APIs as fallback
      }
    }
  },

  // Firebase Configuration
  firebase: {
    apiKey: 'AIzaSyBotT5BDpUyOr33PLb3s9fcC6CBslp60Bc',
    authDomain: 'priming-ai-7.firebaseapp.com',
    projectId: 'priming-ai-7',
    storageBucket: 'priming-ai-7.appspot.com',
    messagingSenderId: '12347834912',
    appId: '1:12347834912:web:6bad4f89e9a78e1ab1238a'
  },

  // API URLs
  api: {
    baseUrl: 'https://priming-1532995a3138.herokuapp.com'
  }
};
