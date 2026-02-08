/**
 * AI Models and Interfaces
 * Unified types for all AI operations in the Priming application
 */

// Text Generation
export interface TextGenerationOptions {
  temperature?: number;      // 0.0 - 1.0, default 0.7
  maxTokens?: number;        // Maximum response tokens
  systemPrompt?: string;     // System context/instructions
  stream?: boolean;          // Enable streaming response
}

export interface TextGenerationRequest {
  prompt: string;
  options?: TextGenerationOptions;
}

export interface TextGenerationResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Text-to-Speech
export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'default';

export interface TTSOptions {
  voice?: TTSVoice | string;
  language?: string;         // 'en-GB', 'en-US', 'pt-BR'
  speed?: number;            // 0.5 - 2.0
  pitch?: number;            // 0 - 2
}

export interface TTSRequest {
  text: string;
  options?: TTSOptions;
}

// Speech-to-Text
export interface STTOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface STTRequest {
  audioBlob: Blob;
  options?: STTOptions;
}

export interface STTResponse {
  text: string;
  confidence?: number;
}

// Image Generation
export type ImageSize = '256x256' | '512x512' | '1024x1024';
export type ImageQuality = 'standard' | 'hd';

export interface ImageGenerationOptions {
  size?: ImageSize;
  quality?: ImageQuality;
  style?: 'vivid' | 'natural';
}

export interface ImageGenerationRequest {
  prompt: string;
  options?: ImageGenerationOptions;
}

export interface ImageGenerationResponse {
  url: string;
  revisedPrompt?: string;
}

// Grammar Analysis
export type PartOfSpeech =
  | 'Noun'
  | 'Verb'
  | 'Adjective'
  | 'Adverb'
  | 'Pronoun'
  | 'Preposition'
  | 'Conjunction'
  | 'Determiner'
  | 'Interjection'
  | 'Unknown';

export interface GrammarWord {
  word: string;
  type: PartOfSpeech;
  color: string;
}

export interface GrammarAnalysisResponse {
  words: GrammarWord[];
  sentences: string[];
  summary?: {
    nouns: number;
    verbs: number;
    adjectives: number;
    adverbs: number;
    pronouns: number;
  };
}

// Chat/Conversation
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatRequest {
  messages: ChatMessage[];
  options?: TextGenerationOptions;
}

// Educational Content Generation
export type ContentType = 'phrase' | 'text' | 'word' | 'story';

export interface EducationalContentRequest {
  type: ContentType;
  topic: string;
  targetWord?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  ageGroup?: 'children' | 'teens' | 'adults';
}

export interface EducationalContentResponse {
  content: string;
  relatedPhrases?: string[];
  vocabulary?: string[];
}

// AI Service State
export type AIServiceState = 'idle' | 'loading' | 'streaming' | 'error';

export interface AIServiceError {
  code: string;
  message: string;
  details?: unknown;
}

// Grammar Colors Map
export const GRAMMAR_COLORS: Record<PartOfSpeech, string> = {
  'Noun': '#9932CC',       // Purple
  'Verb': '#FF4500',       // Orange Red
  'Adjective': '#32CD32',  // Lime Green
  'Adverb': '#9932CC',     // Purple
  'Pronoun': '#20B2AA',    // Light Sea Green
  'Preposition': '#FFA500', // Orange
  'Conjunction': '#FF69B4', // Hot Pink
  'Determiner': '#1E90FF',  // Dodger Blue
  'Interjection': '#FFD700', // Gold
  'Unknown': '#808080'      // Gray
};
