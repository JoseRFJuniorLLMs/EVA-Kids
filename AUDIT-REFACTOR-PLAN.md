# EVA-Kids - Auditoria Completa & Plano de Refatoracao

> **Data:** 2026-02-08
> **Versao Auditada:** Angular 17.0.9 | Bundle: 17.48 MB
> **Objetivo:** Remover todo legado, limpar dependencias, consolidar jogos e bibliotecas

---

## Indice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Diagnostico Atual](#2-diagnostico-atual)
3. [Problemas Criticos (Seguranca)](#3-problemas-criticos-seguranca)
4. [Dependencias - Limpeza](#4-dependencias---limpeza)
5. [Codigo Morto & Legado](#5-codigo-morto--legado)
6. [Consolidacao de Jogos](#6-consolidacao-de-jogos)
7. [Consolidacao de Bibliotecas/Livros](#7-consolidacao-de-bibliotecaslivros)
8. [Servicos - Refatoracao](#8-servicos---refatoracao)
9. [Framework Vex - Decisao](#9-framework-vex---decisao)
10. [Plano de Execucao (Fases)](#10-plano-de-execucao-fases)
11. [Checklist de Tarefas](#11-checklist-de-tarefas)

---

## 1. Resumo Executivo

### Numeros Atuais

| Metrica | Valor | Alvo |
|---------|-------|------|
| Bundle (initial) | 17.48 MB | < 8 MB |
| Dependencias (package.json) | 98 | ~50 |
| Dependencias UNUSED | 31 | 0 |
| Arquivos .ts em pages/apps/ | 129 | ~60 |
| Testes (.spec.ts) | 3 | 30+ |
| console.log no codigo | 191 | 0 |
| APIs hardcoded | 20+ URLs | 0 (usar environment) |
| API keys expostas no frontend | 3 | 0 |
| Servicos de voz legados | 12 | 1 (UnifiedVoiceService) |
| Leitores de livro duplicados | 4 | 1 (books) |
| Jogos de voz duplicados | 5 | 1 configuravel |
| Diretorio src/ia/ (morto) | 1,138 linhas | Deletar |
| Static data nao usada | 7 de 10 arquivos | Deletar |

### Impacto Estimado da Limpeza

- **Bundle:** -5 a -8 MB (remocao de TensorFlow, D3, NLP libs nao usadas)
- **Codigo:** -3,000+ linhas mortas removidas
- **Seguranca:** 3 vulnerabilidades criticas corrigidas
- **Manutencao:** 50% menos arquivos para manter

---

## 2. Diagnostico Atual

### Stack

| Camada | Tecnologia | Status |
|--------|------------|--------|
| Framework | Angular 17.0.9 (Standalone) | OK |
| UI | Angular Material 17 + Tailwind 3.3.5 | OK |
| Layout | @vex (framework interno) | Avaliar |
| IA | Google Gemini (gemini-1.5-flash) | OK |
| Voz | UnifiedVoiceService + EVA-Mind WS | OK |
| Audio | WaveSurfer.js 7.7.14 | OK |
| Auth | Firebase Auth (@angular/fire 17) | OK |
| DB | Firestore | OK |
| NLP | Compromise.js 14 | OK |
| Grafos | vis-network 9.1.9 | OK |
| eBooks | epubjs 0.3.93 | OK |
| Charts | ApexCharts 3.44 | OK |

### Estrutura de Diretorios

```
src/
├── app/
│   ├── core/services/          # 16 servicos (OK, limpo)
│   ├── layouts/                # 30+ componentes Vex (avaliar)
│   ├── model/                  # 49 modelos (25 .ts, maioria usada)
│   ├── pages/
│   │   ├── apps/               # 129 componentes, 29 apps (LIMPAR)
│   │   ├── dashboards/         # 15+ widgets (OK)
│   │   ├── pages/              # auth, errors, pricing (OK)
│   │   └── ui/                 # 15+ demos Material (REMOVER?)
│   └── shared/                 # 1 componente (voice-assistant)
├── @vex/                       # Framework UI interno (AVALIAR)
├── ia/                         # 8 arquivos mortos (DELETAR)
├── static-data/                # 10 arquivos, 7 nao usados (LIMPAR)
├── assets/
│   ├── audio/                  # 17 arquivos (OK)
│   └── epub/                   # 100+ eBooks (OK)
└── environments/               # 2 arquivos (CORRIGIR keys)
```

---

## 3. Problemas Criticos (Seguranca)

### CRITICO-1: API Keys expostas no frontend

**Arquivos afetados:**

| Arquivo | Problema |
|---------|----------|
| `environments/environment.ts:9,15` | Gemini API Key hardcoded |
| `environments/environment.ts:26-32` | Firebase config hardcoded |
| `app.config.ts:23-31` | Firebase config duplicado |
| `core/services/ai/gemini-audio.service.ts:84` | API key em URL query param |
| `gpt4.json` (raiz do projeto) | OpenAI API key em arquivo JSON |

**8 arquivos importam gpt4.json:**
1. `book/openia.service.ts`
2. `audio-books/audio-books.component.ts`
3. `book2/google.service.ts`
4. `note/note-img.service.ts`
5. `puzzle-block/voz.component.ts`
6. `share-bottom-books3.component.ts`
7. `share-bottom-gpt4.component.ts` (2x)

**Acao:**
- [ ] Deletar `gpt4.json` do repositorio
- [ ] Remover TODAS as 8 importacoes de gpt4.json
- [ ] Mover API keys para backend proxy
- [ ] Nunca passar API key em URL query string

### CRITICO-2: CPF (PII) sem criptografia

**Arquivo:** `eva-mind-websocket.service.ts`
- CPF armazenado em memoria sem criptografia
- CPF transmitido via WebSocket em JSON plain text

**Acao:**
- [ ] Usar WSS (ja faz) mas validar certificado
- [ ] Nao armazenar CPF no frontend apos envio

### CRITICO-3: API deprecated (text-davinci-003)

**Arquivo:** `book/openia.service.ts:10`
```
https://api.openai.com/v1/engines/text-davinci-003/completions
```
- Modelo descontinuado pela OpenAI em Jan 2024
- Servico QUEBRADO em producao

**Acao:**
- [ ] Deletar `openia.service.ts` inteiro
- [ ] Migrar funcionalidade para `UnifiedAIService` (Gemini)

---

## 4. Dependencias - Limpeza

### REMOVER (31 dependencias nao usadas)

#### Categoria: Server-side (nao funciona no browser)

| Pacote | Motivo |
|--------|--------|
| `firebase-admin ^11.6.0` | Lib server-side, nao roda no browser |
| `firebase-functions ^4.3.0` | Cloud Functions, nao roda no browser |
| `@google-cloud/aiplatform ^3.0.0` | Server-side Vertex AI |
| `@google-cloud/vertexai ^0.2.1` | Server-side Vertex AI |
| `google-auth-library 9.6.3` | Server-side auth |

#### Categoria: AI/NLP nao usados

| Pacote | Motivo |
|--------|--------|
| `langchain 0.1.33` | Nao importado em nenhum arquivo |
| `openai ^4.28.0` | Nao importado (usa HTTP direto, e tb legado) |
| `natural ^7.0.6` | Nao importado (compromise.js e usado) |
| `nlp-compromise ^7.0.0` | Alias antigo, `compromise` e importado |
| `@google-ai/generativelanguage ^2.0.0` | Nao importado (@google/generative-ai e usado) |
| `sentence-splitter ^5.0.0` | Nao importado |
| `annyang ^2.6.1` | Nao importado (Web Speech API usado) |

#### Categoria: Visualizacao duplicada/nao usada

| Pacote | Motivo |
|--------|--------|
| `d3 ^7.9.0` | Nao importado (vis-network e apexcharts usados) |
| `d3-drag ^3.0.0` | Depende do d3 nao usado |
| `@swimlane/ngx-charts ^20.5.0` | Nao importado (apexcharts usado) |
| `@swimlane/ngx-graph ^8.3.0` | Nao importado (vis-network usado) |
| `angular-calendar ~0.31.0` | Nao importado |

#### Categoria: Auth duplicado

| Pacote | Motivo |
|--------|--------|
| `@auth0/angular-jwt ^5.2.0` | Nao importado (Firebase Auth usado) |
| `jwt-decode ^4.0.0` | Nao importado |

#### Categoria: Polyfills desnecessarios

| Pacote | Motivo |
|--------|--------|
| `crypto-browserify ^3.12.0` | Nao importado |
| `os-browserify ^0.3.0` | Nao importado |
| `path-browserify ^1.0.1` | Nao importado |
| `stream-browserify ^3.0.0` | Nao importado |
| `url ^0.11.3` | Nao importado |
| `util ^0.12.5` | Nao importado |

#### Categoria: Outros nao usados

| Pacote | Motivo |
|--------|--------|
| `long ^5.2.3` | Dependencia das libs google-cloud (removidas) |
| `keycharm ^0.4.0` | Nao importado |
| `component-emitter ^2.0.0` | Nao importado |
| `@ngneat/falso ^7.1.1` | Nao importado |
| `zod ^3.22.4` | Nao importado |
| `font-awesome ^4.7.0` | Duplicado (@fortawesome 6 usado) |

#### DevDependencies para remover

| Pacote | Motivo |
|--------|--------|
| `@types/annyang ^2.6.5` | annyang removido |
| `@types/chroma-js ^2.4.1` | chroma-js nao existe |
| `@types/d3 ^7.4.3` | d3 removido |
| `@types/hammerjs ^2.0.45` | hammerjs legacy |

### ADICIONAR (1 dependencia faltando)

| Pacote | Motivo |
|--------|--------|
| `three` | Importado em `src/ia/visual-3d.ts` mas NAO esta no package.json (se manter src/ia/) |

> **Nota:** Se deletar `src/ia/` (recomendado), nao precisa adicionar `three`.

### MANTER (essenciais + usadas)

Angular core, Material, RxJS, Tailwind, Firebase/AngularFire, WaveSurfer.js, epubjs, compromise, vis-network, vis-data, ApexCharts, Luxon, date-fns, @google/generative-ai, @tensorflow/tfjs (para NLP no graph), showdown, screenfull, simplebar, ngx-quill, highlight.js, prismjs, ngx-loading-bar, @fortawesome/*.

---

## 5. Codigo Morto & Legado

### DELETAR: Diretorio `src/ia/` (1,138 linhas)

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `index.tsx` | 350 | Web Component Lit (nao Angular) |
| `visual-3d.ts` | 303 | Three.js mandala (nao importado) |
| `visual.ts` | 120 | 2D waveform (nao importado) |
| `mandala-geometry.ts` | 166 | Geometria 3D (nao importado) |
| `sphere-shader.ts` | 91 | Shaders GLSL (nao importado) |
| `analyser.ts` | 35 | FFT analysis (nao importado) |
| `utils.ts` | 73 | Base64 utils (nao importado) |
| `index.html` | - | HTML standalone (nao importado) |

**Status:** Proof-of-concept para Gemini audio. Nunca integrado ao Angular. Funcionalidade ja coberta por `EVAMindWebSocketService`.

### DELETAR: Static data nao usada (7 arquivos)

| Arquivo | Descricao |
|---------|-----------|
| `static-data/aio-table-data.ts` | Dados fake de usuarios |
| `static-data/chat-messages.ts` | 1000+ mensagens Lorem Ipsum |
| `static-data/contacts.ts` | 100+ contatos fake |
| `static-data/fakeMails.ts` | Emails mock |
| `static-data/friend-suggestions.ts` | Sugestoes fake |
| `static-data/scrumboard.ts` | Kanban mock |
| `static-data/table-sales-data.ts` | Dados de vendas |

**Manter:** `colors.ts`, `icons-fa.ts`, `icons-ic.ts` (usados em UI demos)

### DELETAR: Servico OpenAI legado

| Arquivo | Motivo |
|---------|--------|
| `pages/apps/book/openia.service.ts` | API text-davinci-003 descontinuada |
| `gpt4.json` (raiz) | API key exposta |

### DELETAR: Diretorios vazios/incompletos

| Diretorio | Status |
|-----------|--------|
| `pages/apps/aluno/` | VAZIO - sem arquivos .ts |
| `pages/apps/antonimo/` | Apenas `word.json`, sem componente |

### LIMPAR: Diretorios de livros legados

| Diretorio | Arquivos | Acao |
|-----------|----------|------|
| `pages/apps/book/` | book.component + openia.service + services | DELETAR (rota redireciona para books) |
| `pages/apps/book2/` | book2.component + dialogs + google.service | DELETAR (rota redireciona para books) |
| `pages/apps/book3/` | book3.component + dialog + load-json | DELETAR (rota redireciona para books) |

**Manter:** `pages/apps/books/` (implementacao unificada) e `pages/apps/book4/` (grammar analyzer)

### LIMPAR: 191 console.log

**Top ofensores:**

| Arquivo | console.log | console.error |
|---------|------------|---------------|
| puzzle-block/ | 20+ | 5+ |
| voice-comand2/game2 | 15+ | 3+ |
| books/ | 10+ | 5+ |
| dashboard-analytics | 8+ | 3+ |
| note/ | 8+ | 4+ |

**Acao:** Remover todos ou criar `LogService` com niveis (debug/info/warn/error) que sao no-op em producao.

### CORRIGIR: Typos em nomes de arquivo

| Arquivo Atual | Correto |
|---------------|---------|
| `model/enum/stautus-online.ts` | `status-online.ts` |
| `model/phrase/phase-prime-page.ts` | `phrase-prime-page.ts` |
| `pages/apps/voice-comand/` | `voice-command/` (5 diretorios) |

---

## 6. Consolidacao de Jogos

### Estado Atual: 5 jogos de voz separados

| Jogo | Rota | Tamanho | Descricao |
|------|------|---------|-----------|
| voice-comand | /apps/voicegame | 10 KB | Jogo basico de voz |
| voice-comand2 | /apps/voicegame2 | 29 KB | Mais complexo, features extras |
| voice-comand3 | /apps/voicegame3 | ~15 KB | Variante |
| voice-comand4 | /apps/voicegame4 | ~15 KB | Variante |
| voice-comand5 | /apps/voicegame5 | 8 KB | Com vocabulary.ts (1300 linhas) |

### Plano: Consolidar em 1 componente configuravel

```
pages/apps/voice-game/
├── voice-game.component.ts          # Componente unico parametrizado
├── voice-game.component.scss
├── models/
│   ├── game-mode.ts                 # Enum: BASIC, ADVANCED, VOCABULARY, PRONUNCIATION, TRANSLATION
│   └── game-config.ts               # Interface de configuracao por modo
├── data/
│   └── vocabulary.ts                # Dados de vocabulario (extraido do game5)
└── services/
    └── voice-game.service.ts        # Logica do jogo usando UnifiedVoiceService
```

**Rotas:**
```typescript
{ path: 'voice-game',       component: VoiceGameComponent, data: { mode: 'BASIC' } },
{ path: 'voice-game/:mode', component: VoiceGameComponent },
// Redirects de compatibilidade (temporarios)
{ path: 'voicegame',  redirectTo: 'voice-game/basic' },
{ path: 'voicegame2', redirectTo: 'voice-game/advanced' },
{ path: 'voicegame3', redirectTo: 'voice-game/pronunciation' },
{ path: 'voicegame4', redirectTo: 'voice-game/translation' },
{ path: 'voicegame5', redirectTo: 'voice-game/vocabulary' },
```

### Outros jogos (manter como estao)

| Jogo | Status | Acao |
|------|--------|------|
| dino | Funcional, voz integrada | Manter |
| teris (tetris) | Funcional, sem voz | Manter, adicionar voz? |
| quebra (puzzle) | Funcional, Firebase integrado | Manter, remover import gpt4.json |
| memory (card) | Funcional, voz integrada | Manter |
| word-search | Funcional | Manter |
| puzzle-block | Funcional, audio complexo | Manter, limpar TODOs |

---

## 7. Consolidacao de Bibliotecas/Livros

### Estado Atual: 5 implementacoes

| Componente | Rota | Status | Tecnologia |
|------------|------|--------|------------|
| book/ | /apps/book → redirect | LEGADO | epubjs + OpenAI |
| book2/ | /apps/book2 → redirect | LEGADO | epubjs + Google Books + PDF |
| book3/ | /apps/book3 → redirect | LEGADO | JSON + dialog |
| books/ | /apps/books | ATIVO | epubjs + Gemini Audio |
| book4/ | /apps/grammar-analyzer | ATIVO | Compromise.js + Ollama |

### Plano

1. **Deletar** `book/`, `book2/`, `book3/` (ja redirecionam para `books/`)
2. **Manter** `books/` como leitor principal
3. **Manter** `book4/grammar-analyzer` (funcionalidade diferente: analise gramatical)
4. **Migrar** funcionalidades uteis de book2 para books:
   - Google Books API search (se necessario)
   - Upload de arquivos (drag-and-drop)
5. **Remover** redirects de `app.routes.ts` apos 1 release

### Features a preservar do book2 (migrar para books se util)

- [ ] Google Books API integration
- [ ] File upload dialog
- [ ] Text extraction com TTS
- [ ] Layout options (paginated, continuous, flowing)

---

## 8. Servicos - Refatoracao

### Servicos Legados de Voz (12 → ja consolidados em 1)

O `UnifiedVoiceService` ja substituiu os 12 servicos legados:

| Servico Legado | Localizado em | Acao |
|---------------|---------------|------|
| VoiceRecognitionService | voice-comand/ | Deletar com diretorio |
| Voice2RecognitionService | voice-comand2/ | Deletar com diretorio |
| Voice3RecognitionService | voice-comand3/ | Deletar com diretorio |
| Voice4RecognitionService | voice-comand4/ | Deletar com diretorio |
| Voice5RecognitionService | voice-comand5/ | Deletar com diretorio |
| Voice6RecognitionService | memory/ | Verificar se ainda importa |
| Voice7RecognitionService | dino/ | Verificar se ainda importa |
| Voice8RecognitionService | word-search/ | Verificar se ainda importa |
| VoiceCardRecognitionService | note/list/ | Verificar se ainda importa |
| VoiceCabRecognitionService | quebra/ | Verificar se ainda importa |
| VoiceFoodRecognitionService | footer/ | Verificar se ainda importa |
| SpeechRecognitionService | services/ | Verificar se ainda importa |

**Acao:** Verificar cada jogo se ainda importa servico legado ou ja usa `UnifiedVoiceService`. Remover os legados.

### Servicos de IA (simplificar)

| Servico | Status | Acao |
|---------|--------|------|
| UnifiedAIService | ATIVO, Gemini | Manter |
| GeminiAudioService | ATIVO, Gemini Audio | Manter (avaliando se EVA-Mind substitui) |
| EVAMindWebSocketService | ATIVO, WebSocket | Manter |
| VoiceAssistantService | ATIVO, facade | Manter |
| openia.service.ts | MORTO | Deletar |
| ollama.service.ts | ATIVO (local) | Manter para dev, desabilitar em prod |

### Servicos de Dados

| Servico | Status | Acao |
|---------|--------|------|
| DataService | ATIVO | Manter |
| NlpService | ATIVO (TensorFlow) | Manter |
| CardService | ATIVO | Manter |
| DinoService | ATIVO | Manter |
| NoteService | ATIVO (Firestore) | Manter |
| SatoshiService | ATIVO | Manter |
| SoundService | ATIVO | Manter |
| courses.service.ts | ATIVO | Mover URL hardcoded para environment |

### URLs Hardcoded para Migrar

| Arquivo | URL Atual | Migrar Para |
|---------|-----------|-------------|
| app-config_url.ts (15 URLs) | priming...herokuapp.com | `environment.api.baseUrl` |
| courses.service.ts | URL completa hardcoded | `environment.api.baseUrl + path` |
| gemini-audio.service.ts | googleapis.com | `environment.ai.gemini.baseUrl` |
| ollama.service.ts | localhost:11434 | `environment.ai.ollama?.baseUrl` |
| note-img.service.ts | openai.com/v1/images | Migrar para Gemini ou remover |

---

## 9. Framework Vex - Decisao

### O que e o @vex

Framework UI interno com 10 componentes, 8 animacoes, 4 servicos, 6 presets de layout (Apollo, Poseidon, Hermes, Ares, Ikaros, Zeus). Nao e um pacote npm - vive em `src/@vex/`.

### Componentes Vex usados

| Componente | Usado | Pode substituir |
|------------|-------|-----------------|
| vex-breadcrumbs | Sim | Angular Material breadcrumb (simples) |
| vex-chart | Sim | ApexCharts direto |
| vex-highlight | Sim | ngx-highlightjs direto |
| vex-page-layout | Sim | CSS/Tailwind layout |
| vex-popover | Sim | Angular CDK Overlay |
| vex-progress-bar | Sim | ngx-loading-bar direto |
| vex-scrollbar | Sim | simplebar direto |
| vex-secondary-toolbar | Sim | Tailwind toolbar |
| vex-showdown | Sim | showdown pipe simples |
| vex-sidebar | Sim | Angular Material sidenav |

### Recomendacao: MANTER @vex por agora

**Justificativa:**
- Funciona bem e e ativamente mantido
- Substituir custaria 2-3 semanas sem ganho funcional
- Nao e legado - usa Angular 17 standalone + signals
- Foco deve ser na limpeza de codigo morto, nao reescrever UI que funciona

**Acao futura (Fase 3):**
- Avaliar se vale simplificar para Material + Tailwind puro
- Remover presets de layout nao usados (dos 6, provavelmente so 1-2 sao usados)

---

## 10. Plano de Execucao (Fases)

### FASE 1: Seguranca & Limpeza Critica (1-2 dias)

**Objetivo:** Remover vulnerabilidades e codigo morto obvio.

1. Deletar `gpt4.json` da raiz
2. Remover todas importacoes de `gpt4.json` (8 arquivos)
3. Deletar `src/ia/` inteiro (1,138 linhas)
4. Deletar 7 arquivos de `static-data/` nao usados
5. Deletar `pages/apps/book/openia.service.ts`
6. Deletar diretorios vazios (`aluno/`, `antonimo/` se so tem json)
7. Mover API keys para environment (nao commitar .env)
8. Remover API key de URL query string no gemini-audio.service.ts
9. Rodar `npm run build` - verificar que compila

**Validacao:** Build passa, app funciona, nenhuma API key exposta.

### FASE 2: Limpeza de Dependencias (1 dia)

**Objetivo:** Remover 31+ pacotes nao usados do package.json.

1. Remover dependencias nao usadas (lista da Secao 4)
2. Remover devDependencies nao usadas
3. `npm install` para atualizar lock file
4. `npm run build` - verificar que compila
5. Verificar bundle size (deve cair significativamente)

**Validacao:** Build passa, bundle < 12 MB.

### FASE 3: Deletar Livros Legados (1 dia)

**Objetivo:** Remover 3 implementacoes duplicadas de leitores.

1. Deletar `pages/apps/book/` inteiro
2. Deletar `pages/apps/book2/` inteiro
3. Deletar `pages/apps/book3/` inteiro
4. Atualizar `app.routes.ts` - remover redirects (rota direto para `books`)
5. Verificar se `books/` tem todas as features necessarias
6. Build + teste manual do leitor de livros

**Validacao:** Leitor de livros funciona, nenhum link quebrado.

### FASE 4: Consolidar Jogos de Voz (3-5 dias)

**Objetivo:** Unificar 5 jogos de voz em 1 componente parametrizado.

1. Analisar features unicas de cada jogo (game1-5)
2. Criar `pages/apps/voice-game/` com componente unico
3. Implementar `GameMode` enum com configuracao por modo
4. Extrair `vocabulary.ts` para `voice-game/data/`
5. Migrar logica dos 5 jogos para o componente unico
6. Atualizar rotas com redirects de compatibilidade
7. Testar cada modo do jogo
8. Deletar `voice-comand/` ate `voice-comand5/` antigos
9. Build + teste

**Validacao:** Todos os 5 modos de jogo funcionam, rotas antigas redirecionam.

### FASE 5: Limpar Servicos Legados (2-3 dias)

**Objetivo:** Garantir que nenhum servico legado de voz esta em uso.

1. Grep por cada servico legado listado na Secao 8
2. Verificar cada jogo/componente que importa servico legado
3. Migrar para `UnifiedVoiceService` onde necessario
4. Deletar arquivos de servicos legados
5. Migrar URLs hardcoded para `environment`
6. Criar `environment.ai.ollama` config
7. Remover import de note-img.service.ts para OpenAI
8. Build + teste

**Validacao:** Nenhum servico legado importado, todas as URLs em environment.

### FASE 6: Qualidade de Codigo (2-3 dias)

**Objetivo:** Limpar console.logs, corrigir typos, adicionar testes basicos.

1. Remover todos os 191 `console.log` (ou criar LogService)
2. Corrigir typos em nomes de arquivo (stautus → status, phase → phrase)
3. Corrigir typo nos diretorios (voice-comand → voice-command) se mantidos
4. Resolver TODOs no puzzle-block
5. Adicionar testes unitarios para:
   - UnifiedVoiceService
   - UnifiedAIService
   - EVAMindWebSocketService
   - VoiceAssistantService
   - Pelo menos 1 teste por jogo
6. Build + rodar testes

**Validacao:** 0 console.log, 20+ testes passando, 0 TODOs.

### FASE 7: Remover UI Demos (opcional, 1 dia)

**Objetivo:** Remover paginas de demo do Material que nao sao funcionalidade do app.

As 15+ paginas em `pages/ui/` sao showcase do template Vex original:
- components-autocomplete, components-buttons, etc.
- forms/form-elements, forms/form-wizard
- page-layouts/*

**Decisao:** Se essas paginas nao sao acessiveis para usuarios finais (criancas), deletar.

1. Verificar se ha links para essas paginas na navegacao
2. Se nao, deletar `pages/ui/` inteiro
3. Remover rotas em `app.routes.ts`
4. Build

**Validacao:** App funciona sem paginas de demo.

---

## 11. Checklist de Tarefas

### Fase 1 - Seguranca & Limpeza Critica
- [ ] Deletar `gpt4.json`
- [ ] Remover 8 importacoes de `gpt4.json`
- [ ] Deletar `src/ia/` (8 arquivos)
- [ ] Deletar `static-data/aio-table-data.ts`
- [ ] Deletar `static-data/chat-messages.ts`
- [ ] Deletar `static-data/contacts.ts`
- [ ] Deletar `static-data/fakeMails.ts`
- [ ] Deletar `static-data/friend-suggestions.ts`
- [ ] Deletar `static-data/scrumboard.ts`
- [ ] Deletar `static-data/table-sales-data.ts`
- [ ] Deletar `book/openia.service.ts`
- [ ] Deletar diretorio vazio `pages/apps/aluno/`
- [ ] Mover Gemini API key para backend proxy
- [ ] Corrigir gemini-audio.service.ts (API key em URL)
- [ ] Build OK

### Fase 2 - Dependencias
- [ ] Remover 31 dependencias nao usadas
- [ ] Remover 4 devDependencies nao usadas
- [ ] npm install
- [ ] Build OK
- [ ] Verificar bundle size

### Fase 3 - Livros Legados
- [ ] Deletar `pages/apps/book/`
- [ ] Deletar `pages/apps/book2/`
- [ ] Deletar `pages/apps/book3/`
- [ ] Atualizar app.routes.ts
- [ ] Teste manual do leitor
- [ ] Build OK

### Fase 4 - Consolidar Jogos
- [ ] Criar `pages/apps/voice-game/` componente
- [ ] Implementar GameMode enum
- [ ] Migrar logica dos 5 jogos
- [ ] Extrair vocabulary.ts
- [ ] Atualizar rotas
- [ ] Testar cada modo
- [ ] Deletar voice-comand/ ate voice-comand5/
- [ ] Build OK

### Fase 5 - Servicos Legados
- [ ] Audit cada servico legado de voz
- [ ] Migrar componentes para UnifiedVoiceService
- [ ] Deletar servicos legados
- [ ] Migrar URLs hardcoded para environment
- [ ] Remover nota-img.service.ts OpenAI import
- [ ] Build OK

### Fase 6 - Qualidade
- [ ] Remover 191 console.log
- [ ] Corrigir typos de arquivo
- [ ] Resolver TODOs
- [ ] Adicionar 20+ testes unitarios
- [ ] Build + testes OK

### Fase 7 - UI Demos (opcional)
- [ ] Avaliar se pages/ui/ e acessivel
- [ ] Deletar pages/ui/ se nao usado
- [ ] Remover rotas
- [ ] Build OK

---

## Metricas Alvo Pos-Refatoracao

| Metrica | Atual | Alvo |
|---------|-------|------|
| Bundle (initial) | 17.48 MB | < 10 MB |
| Dependencias | 98 | ~55 |
| Arquivos em pages/apps/ | 129 | ~70 |
| Testes | 3 | 25+ |
| console.log | 191 | 0 |
| APIs hardcoded | 20+ | 0 |
| API keys expostas | 3 | 0 |
| Servicos de voz | 12+ | 2 (Unified + EVA-Mind) |
| Leitores de livro | 5 | 2 (books + grammar) |
| Jogos de voz | 5 dirs | 1 dir (parametrizado) |

---

*Documento gerado automaticamente pela auditoria do Claude Code em 2026-02-08*
