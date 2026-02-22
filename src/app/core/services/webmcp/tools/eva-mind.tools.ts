/**
 * WebMCP Tools - EVA-Mind WebSocket (EVA-Kids)
 */

import { EVAMindWebSocketService } from '../../eva-mind/eva-mind-websocket.service';
import type { WebMCPTool } from '../webmcp-adapter.service';

export function createEvaMindTools(evaMind: EVAMindWebSocketService): WebMCPTool[] {
  return [
    {
      name: 'eva_connect',
      description: 'Conecta ao EVA via WebSocket para comunicação em tempo real (voz e texto).',
      inputSchema: {
        type: 'object',
        properties: {
          cpf: { type: 'string', description: 'CPF do usuário (apenas números)' },
        },
        required: ['cpf'],
      },
      execute: async (args) => {
        await evaMind.connect(args['cpf'] as string);
        return { success: true, state: evaMind.currentState };
      },
    },
    {
      name: 'eva_disconnect',
      description: 'Desconecta do EVA e encerra a sessão.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        evaMind.hangup();
        return { success: true };
      },
    },
    {
      name: 'eva_send_text',
      description: 'Envia uma mensagem de texto para o EVA.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a enviar' },
        },
        required: ['text'],
      },
      execute: async (args) => {
        evaMind.sendText(args['text'] as string);
        return { success: true, sent: args['text'] };
      },
    },
    {
      name: 'eva_get_state',
      description: 'Retorna o estado atual da conexão EVA (idle, connecting, registered, active, speaking, error).',
      inputSchema: { type: 'object', properties: {} },
      readOnly: true,
      execute: async () => {
        return { state: evaMind.currentState };
      },
    },
    {
      name: 'eva_start_call',
      description: 'Inicia uma chamada de voz ativa com a EVA (requer conexão prévia).',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        evaMind.startCall();
        return { success: true, state: evaMind.currentState };
      },
    },
  ];
}
