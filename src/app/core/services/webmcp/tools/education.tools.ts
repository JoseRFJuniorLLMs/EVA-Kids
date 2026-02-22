/**
 * WebMCP Tools - Navegação Educacional (EVA-Kids)
 */

import { Router } from '@angular/router';
import type { WebMCPTool } from '../webmcp-adapter.service';

const EDUCATIONAL_APPS = [
  { path: '/apps/voicegame', name: 'Voice Game 1' },
  { path: '/apps/voicegame2', name: 'Voice Game 2' },
  { path: '/apps/voicegame3', name: 'Voice Game 3' },
  { path: '/apps/voicegame4', name: 'Voice Game 4' },
  { path: '/apps/voicegame5', name: 'Voice Game 5' },
  { path: '/apps/card', name: 'Jogo de Memória' },
  { path: '/apps/dino', name: 'Jogo do Dinossauro' },
  { path: '/apps/word-search', name: 'Caça-Palavras' },
  { path: '/apps/quebra-cabeca', name: 'Quebra-Cabeça' },
  { path: '/apps/teris', name: 'Tetris' },
  { path: '/apps/books', name: 'Leitor de Livros' },
  { path: '/apps/grammar-analyzer', name: 'Analisador Gramatical' },
  { path: '/apps/flashcard', name: 'Flashcards' },
  { path: '/apps/notes', name: 'Notas' },
  { path: '/apps/editor', name: 'Editor de Texto' },
];

export function createEducationTools(router: Router): WebMCPTool[] {
  return [
    {
      name: 'navigate_to_educational_app',
      description: `Navega para um aplicativo educacional. Apps disponíveis: ${EDUCATIONAL_APPS.map(a => `${a.name} (${a.path})`).join(', ')}`,
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            enum: EDUCATIONAL_APPS.map(a => a.path),
            description: 'Caminho do app educacional',
          },
        },
        required: ['path'],
      },
      execute: async (args) => {
        const path = args['path'] as string;
        const app = EDUCATIONAL_APPS.find(a => a.path === path);
        if (!app) return { error: `App "${path}" não encontrado` };
        await router.navigate([path]);
        return { success: true, app: app.name, path };
      },
    },
    {
      name: 'list_educational_apps',
      description: 'Lista todos os aplicativos educacionais disponíveis no EVA-Kids.',
      inputSchema: { type: 'object', properties: {} },
      readOnly: true,
      execute: async () => {
        return { apps: EDUCATIONAL_APPS };
      },
    },
  ];
}
