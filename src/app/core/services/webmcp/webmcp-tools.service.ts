/**
 * WebMCP Tools Service - EVA-Kids
 *
 * Orquestra a inicialização do WebMCP e registro de todos os tools.
 * Injeta os Angular services necessários via DI.
 */

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { WebMCPAdapterService } from './webmcp-adapter.service';
import { EVAMindWebSocketService } from '../eva-mind/eva-mind-websocket.service';
import { UnifiedVoiceService } from '../voice/unified-voice.service';
import { UnifiedAIService } from '../ai/unified-ai.service';
import { createEvaMindTools } from './tools/eva-mind.tools';
import { createVoiceTools } from './tools/voice.tools';
import { createAITools } from './tools/ai.tools';
import { createEducationTools } from './tools/education.tools';

@Injectable({
  providedIn: 'root'
})
export class WebMCPToolsService {
  constructor(
    private adapter: WebMCPAdapterService,
    private evaMind: EVAMindWebSocketService,
    private voice: UnifiedVoiceService,
    private ai: UnifiedAIService,
    private router: Router,
  ) {}

  async init(): Promise<void> {
    await this.adapter.init();

    // Registra tools de cada domínio
    this.adapter.registerTools(createEvaMindTools(this.evaMind));
    this.adapter.registerTools(createVoiceTools(this.voice));
    this.adapter.registerTools(createAITools(this.ai));
    this.adapter.registerTools(createEducationTools(this.router));

    console.log(`[WebMCP] EVA-Kids: ${this.adapter.toolCount} tools registrados`);
    console.log('[WebMCP] Tools:', this.adapter.listTools().map(t => t.name).join(', '));
  }
}
