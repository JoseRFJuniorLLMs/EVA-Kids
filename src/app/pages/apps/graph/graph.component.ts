/**
 * Graph Component - Grafo de Palavras Interativo para Criancas
 *
 * Mostra as palavras que a crianca conhece e as palavras priming
 * que se relacionam, ajudando no aprendizado de forma visual e divertida.
 *
 * Usa Gemini Native Audio para pronunciar as palavras.
 */

import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { DataSet } from 'vis-data';
import { Network, Edge, Node } from 'vis-network';
import { DataService } from './data.service';
import { NlpService } from './nlp.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import screenfull from 'screenfull';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NodeDialogComponent } from './node-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { GeminiAudioService } from 'src/app/core/services/ai/gemini-audio.service';
import { Subscription } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';

// Paleta de cores kids
const KIDS_COLORS = {
  purple: '#DA77F2',
  pink: '#F783AC',
  teal: '#38D9A9',
  green: '#69DB7C',
  orange: '#FFA94D',
  yellow: '#FFE066',
  blue: '#74C0FC',
  red: '#FF6B6B',
  cyan: '#66D9E8',
  lime: '#A9E34B'
};

// Array de cores para rotacao
const COLOR_PALETTE = Object.values(KIDS_COLORS);

interface WordNode extends Node {
  id: number;
  label: string;
  isKnown?: boolean;
  isPrime?: boolean;
  relatedWords?: string[];
  category?: string;
}

@Component({
  selector: 'graph-component',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatCardModule
  ],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('pulse', [
      transition('* => *', [
        animate('300ms ease-in-out')
      ])
    ])
  ]
})
export class GraphComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('network', { static: true }) networkContainer!: ElementRef;

  private network!: Network;
  private subscriptions = new Subscription();

  // Dados do grafo
  sentences: string[] = [];
  nodes: DataSet<WordNode> = new DataSet<WordNode>();
  edges: DataSet<Edge> = new DataSet<Edge>();
  primeToTarget: { [key: string]: string } = {};
  colorMapping: { [key: string]: string } = {};

  // Estatisticas
  totalWords = 0;
  knownWords = 0;
  wordsToLearn = 0;
  progressPercent = 0;

  // Estados da UI
  isLoading = true;
  loadingMessage = 'Carregando palavrinhas...';
  isSpeaking = false;
  currentWord = '';
  selectedNode: WordNode | null = null;
  showHelpTip = true;

  // Configuracoes do grafo (simplificadas para criancas)
  physicsEnabled = true;

  constructor(
    private dialog: MatDialog,
    private dataService: DataService,
    private nlpService: NlpService,
    private layoutService: VexLayoutService,
    private cdr: ChangeDetectorRef,
    private geminiAudio: GeminiAudioService
  ) {}

  async ngOnInit() {
    this.loadingMessage = 'Preparando o mapa de palavras...';

    // Subscrever ao estado de audio
    this.subscriptions.add(
      this.geminiAudio.state$.subscribe(state => {
        this.isSpeaking = state === 'speaking';
        this.cdr.detectChanges();
      })
    );

    try {
      // Carregar mapeamentos de palavras prime-target
      this.primeToTarget = this.nlpService.getPrimeToTargetMapping();
      this.colorMapping = this.createKidsColorMapping();

      this.loadingMessage = 'Buscando suas palavras...';

      // Obter frases e nos
      const loadedNodes = await this.dataService.getSentences().toPromise();
      if (loadedNodes && loadedNodes.length > 0) {
        this.processNodes(loadedNodes);
      } else {
        // Sem dados - mostrar grafo vazio
        this.isLoading = false;
        this.loadingMessage = '';
        return;
      }

      this.loadingMessage = 'Conectando as palavras...';

      // Processar similaridades e criar rede
      try {
        await this.processSentences();
      } catch (nlpError) {
        console.warn('NLP processing failed, showing graph without similarity edges:', nlpError);
      }

      this.createNetwork();

      // Calcular estatisticas
      this.calculateStats();

      this.isLoading = false;

      // Falar mensagem de boas-vindas
      setTimeout(() => {
        this.speakWelcome();
      }, 1000);

    } catch (error) {
      console.error('Erro ao carregar grafo:', error);
      this.loadingMessage = 'Ops! Algo deu errado...';
      this.isLoading = false;
    }
  }

  ngAfterViewInit() {
    if (screenfull.isEnabled) {
      screenfull.request();
      this.layoutService.collapseSidenav();
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.geminiAudio.stopPlayback();
    if (this.network) {
      this.network.destroy();
    }
  }

  /**
   * Cria mapeamento de cores kids para categorias
   */
  private createKidsColorMapping(): { [key: string]: string } {
    const mapping: { [key: string]: string } = {};
    const primes = Object.keys(this.primeToTarget);

    primes.forEach((prime, index) => {
      mapping[prime] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });

    return mapping;
  }

  /**
   * Processa nos com cores e estilos kids
   */
  private processNodes(loadedNodes: any[]) {
    const processedNodes: WordNode[] = loadedNodes.map((node, index) => {
      const word = node.label?.toLowerCase() || '';
      const isPrime = !!this.primeToTarget[word];
      const isTarget = Object.values(this.primeToTarget).includes(word);

      // Cor baseada no tipo
      let bgColor = COLOR_PALETTE[index % COLOR_PALETTE.length];
      let borderColor = '#ffffff';
      let shape = 'circle';
      let size = 30;

      if (isPrime) {
        bgColor = KIDS_COLORS.purple;
        borderColor = KIDS_COLORS.pink;
        shape = 'star';
        size = 40;
      } else if (isTarget) {
        bgColor = KIDS_COLORS.teal;
        borderColor = KIDS_COLORS.green;
        shape = 'diamond';
        size = 35;
      }

      return {
        id: node.id || index + 1,
        label: node.label,
        isKnown: node.isKnown ?? Math.random() > 0.3, // Simular se conhece
        isPrime,
        category: node.tag || 'geral',
        color: {
          background: bgColor,
          border: borderColor,
          highlight: {
            background: KIDS_COLORS.yellow,
            border: KIDS_COLORS.orange
          },
          hover: {
            background: KIDS_COLORS.yellow,
            border: KIDS_COLORS.orange
          }
        },
        shape,
        size,
        font: {
          color: '#ffffff',
          size: 16,
          face: 'Fredoka One, cursive, sans-serif',
          strokeWidth: 3,
          strokeColor: 'rgba(0,0,0,0.3)'
        },
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.2)',
          size: 10,
          x: 3,
          y: 3
        }
      };
    });

    this.nodes = new DataSet<WordNode>(processedNodes);
    this.sentences = processedNodes.map(node => node.label);
    this.totalWords = processedNodes.length;
  }

  /**
   * Processa similaridades entre palavras
   */
  async processSentences() {
    const similarities = await this.nlpService.calculateSimilarities(this.sentences);
    const similarityThreshold = 0.5;

    for (let i = 0; i < this.sentences.length; i++) {
      for (let j = i + 1; j < this.sentences.length; j++) {
        const primeTargetRelation = this.checkPrimeTargetRelation(this.sentences[i], this.sentences[j]);
        const semanticSimilarity = similarities[i][j];

        if (primeTargetRelation || semanticSimilarity > similarityThreshold) {
          let color = KIDS_COLORS.blue;
          let width = 2;

          if (primeTargetRelation) {
            color = this.colorMapping[primeTargetRelation.prime] || KIDS_COLORS.purple;
            width = 4;
          } else {
            width = Math.max(1, semanticSimilarity * 4);
          }

          this.edges.add({
            from: i + 1,
            to: j + 1,
            arrows: {
              to: {
                enabled: true,
                scaleFactor: 0.5,
                type: 'circle'
              }
            },
            color: {
              color: color,
              highlight: KIDS_COLORS.yellow,
              hover: KIDS_COLORS.orange
            },
            width: width,
            smooth: {
              enabled: true,
              type: 'curvedCW',
              roundness: 0.2
            },
            shadow: {
              enabled: true,
              color: 'rgba(0,0,0,0.1)',
              size: 5
            }
          });
        }
      }
    }
  }

  /**
   * Verifica relacao prime-target entre duas palavras
   */
  checkPrimeTargetRelation(sentence1: string, sentence2: string): { prime: string, target: string } | null {
    const words1 = sentence1.toLowerCase().split(/\W+/);
    const words2 = sentence2.toLowerCase().split(/\W+/);

    for (const word of words1) {
      if (this.primeToTarget[word] && words2.includes(this.primeToTarget[word])) {
        return { prime: word, target: this.primeToTarget[word] };
      }
    }

    for (const word of words2) {
      if (this.primeToTarget[word] && words1.includes(this.primeToTarget[word])) {
        return { prime: word, target: this.primeToTarget[word] };
      }
    }

    return null;
  }

  /**
   * Cria a rede visual
   */
  createNetwork() {
    const data = { nodes: this.nodes, edges: this.edges };
    const options = this.getNetworkOptions();

    this.network = new Network(this.networkContainer.nativeElement, data, options);

    this.network.once('stabilizationIterationsDone', () => {
      this.network.setOptions({ physics: { enabled: false } });
    });

    this.setupNetworkEvents();
  }

  /**
   * Configura eventos do grafo
   */
  setupNetworkEvents() {
    // Clique simples - fala a palavra
    this.network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const nodeData = this.nodes.get(nodeId);
        const node = (Array.isArray(nodeData) ? nodeData[0] : nodeData) as WordNode;
        if (node) {
          this.selectedNode = node;
          this.speakWord(node.label);
        }
      } else {
        this.selectedNode = null;
      }
    });

    // Duplo clique - abre dialogo
    this.network.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = this.nodes.get(nodeId);
        this.openNodeDialog(node);
      }
    });

    // Hover - destaca conexoes
    this.network.on('hoverNode', (params) => {
      this.network.selectNodes([params.node]);
    });

    this.network.on('blurNode', () => {
      if (!this.selectedNode) {
        this.network.unselectAll();
      }
    });
  }

  /**
   * Opcoes do grafo com visual kids
   */
  getNetworkOptions() {
    return {
      nodes: {
        borderWidth: 3,
        borderWidthSelected: 5,
        chosen: true,
        scaling: {
          min: 20,
          max: 50
        }
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'dynamic',
          roundness: 0.3
        }
      },
      layout: {
        improvedLayout: true,
        randomSeed: 42
      },
      physics: {
        enabled: this.physicsEnabled,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 100,
          springConstant: 0.08,
          damping: 0.4,
          avoidOverlap: 0.5
        },
        stabilization: {
          enabled: true,
          iterations: 200,
          updateInterval: 25
        }
      },
      interaction: {
        hover: true,
        hoverConnectedEdges: true,
        selectConnectedEdges: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
        dragNodes: true,
        navigationButtons: false,
        keyboard: {
          enabled: true
        }
      }
    };
  }

  /**
   * Calcula estatisticas de progresso
   */
  calculateStats() {
    const allNodes = this.nodes.get() as WordNode[];
    this.totalWords = allNodes.length;
    this.knownWords = allNodes.filter(n => n.isKnown).length;
    this.wordsToLearn = this.totalWords - this.knownWords;
    this.progressPercent = this.totalWords > 0 ? Math.round((this.knownWords / this.totalWords) * 100) : 0;
  }

  /**
   * Fala mensagem de boas-vindas
   */
  async speakWelcome() {
    const message = `Ola! Esse e o mapa das suas palavras. Voce ja conhece ${this.knownWords} palavras! Clique em uma palavra para ouvir como se fala.`;
    await this.geminiAudio.speak(message);
  }

  /**
   * Fala uma palavra usando Gemini Audio
   */
  async speakWord(word: string) {
    if (this.isSpeaking) {
      this.geminiAudio.stopPlayback();
    }

    this.currentWord = word;

    try {
      // Prompt para pronunciar em ingles
      const prompt = `You are a friendly pronunciation tutor for children. Say the word "${word}" clearly and slowly in English. After a brief pause, say "Em portugues:" and then say the Portuguese translation if it's an English word, or just repeat the word if it's already in Portuguese. Be encouraging!`;

      if (!this.geminiAudio['isSessionActive']) {
        await this.geminiAudio.connect(prompt);
      }

      await this.geminiAudio.speak(`Say the word: "${word}"`);

    } catch (error) {
      console.error('Erro ao falar palavra:', error);
      // Fallback para browser TTS
      this.fallbackSpeak(word);
    }
  }

  /**
   * Fallback para TTS do navegador
   */
  private fallbackSpeak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Fala palavra e sua relacao priming
   */
  async speakWordWithRelation(word: string) {
    const targetWord = this.primeToTarget[word.toLowerCase()];

    if (targetWord) {
      const message = `A palavra "${word}" ajuda voce a lembrar de "${targetWord}". ${word}... ${targetWord}.`;
      await this.geminiAudio.speak(message);
    } else {
      await this.speakWord(word);
    }
  }

  /**
   * Abre dialogo com detalhes do no
   */
  openNodeDialog(nodeData: any) {
    this.dialog.open(NodeDialogComponent, {
      data: {
        node: nodeData,
        primeToTarget: this.primeToTarget,
        speakWord: (word: string) => this.speakWord(word)
      },
      panelClass: 'kids-dialog-container',
      width: '400px'
    });
  }

  /**
   * Centraliza o grafo
   */
  centerGraph() {
    if (this.network) {
      this.network.fit({
        animation: {
          duration: 500,
          easingFunction: 'easeOutQuad'
        }
      });
    }
  }

  /**
   * Toggle fisica do grafo
   */
  togglePhysics() {
    this.physicsEnabled = !this.physicsEnabled;
    if (this.network) {
      this.network.setOptions({
        physics: { enabled: this.physicsEnabled }
      });
    }
  }

  /**
   * Fala uma palavra aleatoria que precisa aprender
   */
  async speakRandomWord() {
    const allNodes = this.nodes.get() as WordNode[];
    const wordsToLearn = allNodes.filter(n => !n.isKnown);

    if (wordsToLearn.length > 0) {
      const randomNode = wordsToLearn[Math.floor(Math.random() * wordsToLearn.length)];
      this.network.selectNodes([randomNode.id]);
      this.network.focus(randomNode.id, {
        scale: 1.5,
        animation: {
          duration: 500,
          easingFunction: 'easeOutQuad'
        }
      });
      this.selectedNode = randomNode;
      await this.speakWordWithRelation(randomNode.label);
    } else {
      await this.geminiAudio.speak('Parabens! Voce ja conhece todas as palavras!');
    }
  }

  /**
   * Fecha dica de ajuda
   */
  dismissHelpTip() {
    this.showHelpTip = false;
  }

  /**
   * Para o audio
   */
  stopAudio() {
    this.geminiAudio.stopPlayback();
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
  }
}
