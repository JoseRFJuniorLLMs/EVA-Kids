/**
 * WebMCP Adapter Service - Bridge entre W3C navigator.modelContext e polyfill
 *
 * Angular injectable service para gerenciar tools WebMCP.
 */

import { Injectable } from '@angular/core';

export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
  readOnly?: boolean;
}

interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;
  annotations?: { readOnlyHint?: boolean; idempotentHint?: boolean };
}

declare global {
  interface Navigator {
    modelContext?: {
      registerTool(tool: ModelContextTool): void;
      unregisterTool(name: string): void;
      provideContext(options: { tools: ModelContextTool[] }): void;
      clearContext(): void;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class WebMCPAdapterService {
  private tools = new Map<string, WebMCPTool>();
  private _native = false;
  private _polyfillLoaded = false;
  private _initialized = false;

  get isNative(): boolean { return this._native; }
  get isInitialized(): boolean { return this._initialized; }
  get toolCount(): number { return this.tools.size; }

  async init(): Promise<void> {
    if (this._initialized) return;

    this._native = typeof navigator !== 'undefined' && !!navigator.modelContext;

    if (!this._native) {
      try {
        // Variável impede análise estática do bundler - fallback gracioso se não instalado
        const polyfillModule = '@mcp-b/' + 'webmcp-polyfill';
        const mod = await (Function('m', 'return import(m)')(polyfillModule) as Promise<any>);
        (mod as any).initializeWebMCPPolyfill();
        this._polyfillLoaded = true;
        this._native = !!navigator.modelContext;
      } catch {
        console.warn('[WebMCP] Polyfill não instalado. Instale com: npm i @mcp-b/webmcp-polyfill');
      }
    }

    this._initialized = true;
    console.log(`[WebMCP] Inicializado | Nativo: ${this._native} | Polyfill: ${this._polyfillLoaded}`);
  }

  registerTool(tool: WebMCPTool): void {
    this.tools.set(tool.name, tool);

    if (this._native && navigator.modelContext) {
      navigator.modelContext.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: {
          readOnlyHint: tool.readOnly ?? false,
          idempotentHint: tool.readOnly ?? false,
        },
        execute: async (args) => {
          try {
            const result = await tool.execute(args);
            return { content: [{ type: 'text', text: JSON.stringify(result) }] };
          } catch (err) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: String(err) }) }] };
          }
        },
      });
    }
  }

  registerTools(tools: WebMCPTool[]): void {
    tools.forEach(t => this.registerTool(t));
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`[WebMCP] Tool "${name}" não encontrado`);
    return tool.execute(args);
  }

  listTools(): Array<{ name: string; description: string; readOnly: boolean }> {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      readOnly: t.readOnly ?? false,
    }));
  }

  clearAll(): void {
    if (this._native && navigator.modelContext) {
      navigator.modelContext.clearContext();
    }
    this.tools.clear();
  }
}
