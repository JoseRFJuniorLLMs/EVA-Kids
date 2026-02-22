/**
 * WebMCP Tools - IA & Conteúdo Educacional (EVA-Kids)
 */

import { UnifiedAIService } from '../../ai/unified-ai.service';
import type { WebMCPTool } from '../webmcp-adapter.service';
import type { ContentType } from '../../../models/ai.models';
import { firstValueFrom } from 'rxjs';

export function createAITools(ai: UnifiedAIService): WebMCPTool[] {
  return [
    {
      name: 'ai_generate_text',
      description: 'Gera texto usando a IA do EVA backend.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Prompt para geração de texto' },
          system_prompt: { type: 'string', description: 'System prompt (opcional)' },
          max_tokens: { type: 'number', description: 'Máximo de tokens (opcional)' },
        },
        required: ['prompt'],
      },
      execute: async (args) => {
        const result = await firstValueFrom(ai.generateText({
          prompt: args['prompt'] as string,
          options: {
            systemPrompt: args['system_prompt'] as string,
            maxTokens: args['max_tokens'] as number,
          },
        }));
        return { text: result };
      },
    },
    {
      name: 'ai_chat',
      description: 'Chat com a IA do EVA com histórico de mensagens.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Mensagem do usuário' },
          history: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['user', 'assistant'] },
                content: { type: 'string' },
              },
            },
            description: 'Histórico de mensagens (opcional)',
          },
        },
        required: ['message'],
      },
      execute: async (args) => {
        const messages = (args['history'] as any[] || []).concat([
          { role: 'user', content: args['message'] },
        ]);
        const result = await firstValueFrom(ai.chat({ messages }));
        return { response: result };
      },
    },
    {
      name: 'ai_analyze_grammar',
      description: 'Analisa a gramática de um texto, identificando classes gramaticais (substantivo, verbo, adjetivo, etc.).',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto para análise gramatical' },
        },
        required: ['text'],
      },
      readOnly: true,
      execute: async (args) => {
        const result = await firstValueFrom(ai.analyzeGrammar(args['text'] as string));
        return result;
      },
    },
    {
      name: 'ai_generate_educational_content',
      description: 'Gera conteúdo educacional (frase, texto, palavra ou história) para crianças.',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['phrase', 'text', 'word', 'story'], description: 'Tipo de conteúdo' },
          topic: { type: 'string', description: 'Tema do conteúdo' },
          level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], description: 'Nível de dificuldade' },
          language: { type: 'string', description: 'Idioma (ex: pt-BR, en-US)' },
        },
        required: ['type', 'topic'],
      },
      execute: async (args) => {
        const result = await firstValueFrom(ai.generateEducationalContent({
          type: args['type'] as ContentType,
          topic: args['topic'] as string,
        }));
        return result;
      },
    },
    {
      name: 'ai_explain_grammar_word',
      description: 'Explica a gramática de uma palavra específica dentro de um texto.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto contexto' },
          word: { type: 'string', description: 'Palavra a explicar' },
        },
        required: ['text', 'word'],
      },
      readOnly: true,
      execute: async (args) => {
        const result = await firstValueFrom(ai.explainGrammar(args['text'] as string, args['word'] as string));
        return { explanation: result };
      },
    },
    {
      name: 'ai_speak',
      description: 'Sintetiza texto em fala via browser SpeechSynthesis.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto para falar' },
          rate: { type: 'number', description: 'Velocidade da fala (0.5-2.0, padrão: 1)' },
        },
        required: ['text'],
      },
      execute: async (args) => {
        await ai.speak({
          text: args['text'] as string,
          options: {
            speed: args['rate'] as number,
          },
        });
        return { success: true, spoken: args['text'] };
      },
    },
    {
      name: 'ai_get_state',
      description: 'Retorna o estado atual do serviço de IA (idle, loading, streaming, error).',
      inputSchema: { type: 'object', properties: {} },
      readOnly: true,
      execute: async () => {
        return { state: ai.getState() };
      },
    },
  ];
}
