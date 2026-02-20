# CHECKPOINT - EVA-Kids
**Data:** 2026-02-19

---

## O QUE E O PROJETO
Plataforma educacional Angular para criancas aprenderem ingles, com jogos de voz, flashcards spaced-repetition, leitor de ebooks, aulas PDF, e sistema de recompensa Satoshi. Parte do ecossistema EVA.

**Tech Stack:** Angular 17 (Standalone Components), Angular Material, Tailwind CSS, Google Gemini (texto+audio), TensorFlow.js, WaveSurfer.js, epubjs, vis-network, Firebase Hosting

---

## O QUE FUNCIONA
- Auth JWT via EVA-Back API
- Voice Games (4 variantes): fala frases, aluno repete, Q&A dialog, vocabulario
- UnifiedVoiceService: Web Speech API + WaveSurfer + gravacao
- UnifiedAIService: Gemini 1.5 Flash (texto, gramatica, conteudo educacional)
- GeminiAudioService: Gemini 2.0 Flash Live API audio nativo
- EVA-Mind WebSocket: conversa voz bidirecional PCM
- Books Reader: 151 EPUBs + texto com TTS + acessibilidade (dyslexic font, BeeLine, dark mode)
- Aulas PDF: 100+ PDFs com Zettelkasten dialog
- Grammar Analyzer: Compromise.js POS tagging
- Notas/Flashcards: CRUD + spaced repetition + grafo semantico (TensorFlow USE)
- Word Graph: vis-network interativo com audio
- Jogos: Memory, Word Search, Dino, Tetris, Quebra-Cabeca, Puzzle Block
- Video Chat WebRTC: P2P com signaling WebSocket
- Student Management + Satoshi rewards
- 17 audio assets + sons (done, erro, online)

---

## O QUE FALTA FAZER
1. **audio-books/** - componente existe mas SEM ROTA
2. **games/jigsaw/** - componente existe mas SEM ROTA
3. **Navegacao quebrada**: links para /apps/book, /apps/book2, /apps/book3 (rotas nao existem)
4. **Dashboard vazio** - DashboardAnalyticsComponent e stub (isLoading=false, template simples)
5. **Consolidacao planejada (AUDIT-REFACTOR-PLAN.md)** - 7 fases todas pendentes
6. **Ollama service** - hardcoded localhost:11434 (dev only)
7. **Note image service** - ainda referencia OpenAI (nao migrado para Gemini)
8. **CPF necessario para EVA-Mind** mas sem UI para kids
9. **environment.prod.ts** - API key vazia (precisa ser setada antes do deploy)

---

## BUGS
1. **SEGURANCA: API key Gemini hardcoded** em environment.ts
2. **SEGURANCA: API key na URL** do WebSocket (visivel no browser)
3. **CRASH: chat-video toggleCollapse()** - layoutService e null (TypeError)
4. **CRASH: chat-video MAT_DIALOG_DATA** - injetado mas usado como componente roteado
5. **Navegacao quebrada** - 3 links para rotas inexistentes
6. **Typos**: stautus-online.ts, phase-prime-page.ts
7. **base-voice-game** - studentId fallback para string literal 'student-id'
8. **NoteService snackbar** - duracao 90 segundos (deveria ser ~5s)
9. **GeminiAudioService** - usa `gemini-2.0-flash-exp` em vez de modelo correto
10. **191 console.log** espalhados pelo codigo

---

## DEPENDENCIAS PRINCIPAIS
Angular 17.0.9, @google/generative-ai ^0.1.1, @tensorflow/tfjs 4.20.0, epubjs 0.3.93, wavesurfer.js 7.7.14, compromise 14.13.0, vis-network 9.1.9, ngx-extended-pdf-viewer 20.5.0-alpha.2

---

## DEAD CODE / LIXO
- audio-books/ (sem rota)
- games/jigsaw/ (sem rota)
- model/aluno/ (legacy)
- static-data/ (7 arquivos fake data do template VEX)
- pages/ui/ (demos Material do template)
- src/ia/ (referencia Lit - NAO esta neste projeto, esta no EVA-Front)
- l.value (arquivo vazio 0 bytes)
- firebase.txt (notas antigas)
- documentation.html / support.html (HTML estatico)

### .md para deletar:
- README.md (descreve GPT-4 dashboard antigo)
- src/CHANGELOG.md (changelog do framework VEX, nao do EVA-Kids)
