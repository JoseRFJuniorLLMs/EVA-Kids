import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DinoService } from './dinoservice';
import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';

interface Word {
  value: string;
  position: number;
  positionType: 'high' | 'middle' | 'low';
  color: string;
}

@Component({
  selector: 'app-dinossauro',
  templateUrl: './dinossauro.component.html',
  styleUrls: ['./dinossauro.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class DinossauroComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  gameStarted = false;
  dinoHeight = 0;
  jumpHeight = 150;
  words: Word[] = [];
  currentDinoFrame = 0;
  dinoFrames = [
    '-1338px -2px',  // Run frame 1
    '-1514px -2px',  // Run frame 2
  ];
  jumping = false;
  gameLoop: any;
  lastFrameTime = 0;
  frameDuration = 100; // Duração de cada frame em milissegundos
  coinSound = new Audio('../../../../assets/audio/coin.wav');
  powerupSound = new Audio('../../../../assets/audio/powerup.wav');
  jumpSound = new Audio('../../../../assets/audio/jump.wav'); // Adicionado o som de pulo
  wordsCaptured = 0; // Contador de palavras capturadas
  dinoPosition = 20; // Posição inicial do dinossauro
  showScore = false; // Variável para controlar a exibição do score temporário
  lastCapturedWord: string | null = null; // Armazenar a última palavra capturada

  constructor(private dinoService: DinoService, private voiceService: UnifiedVoiceService) {}

  ngOnInit(): void {
    this.voiceService.usePreset('game');

    this.voiceService.command$.pipe(takeUntil(this.destroy$)).subscribe(command => {
      if (command === 'jump') {
        this.jump();
      }
    });
  }

  startGame(): void {
    this.gameStarted = true;
    this.wordsCaptured = 0; // Reset contador
    this.lastCapturedWord = null; // Reset última palavra capturada
    this.generateWords();
    this.startGameLoop();
    this.voiceService.startListening(); // Iniciar reconhecimento de voz
  }

  generateWords(): void {
    setInterval(() => {
      this.dinoService.getNextWord().subscribe(card => {
        const positionType = this.getRandomPositionType();
        const word: Word = {
          value: card.word.toUpperCase(),
          position: window.innerWidth,
          positionType,
          color: this.getRandomColor()
        };
        this.words.push(word);
      });
    }, 2000);
  }

  getRandomPositionType(): 'high' | 'middle' | 'low' {
    const rand = Math.random();
    if (rand < 0.33) {
      return 'high';
    } else if (rand < 0.66) {
      return 'middle';
    } else {
      return 'low';
    }
  }

  getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  startGameLoop(): void {
    let lastTime = 0;
    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;

      this.updateGame(deltaTime);
      this.gameLoop = requestAnimationFrame(gameLoop);
    };
    this.gameLoop = requestAnimationFrame(gameLoop);
  }

  updateGame(deltaTime: number): void {
    this.moveWords(deltaTime);
    this.checkCollision();
    this.updateDinoPosition(deltaTime);
    this.animateDino(deltaTime);
  }

  moveWords(deltaTime: number): void {
    const speed = 0.3; // Aumentado para mover as palavras mais rápido
    this.words.forEach((word) => {
      word.position -= speed * deltaTime;
    });
    // Remover palavras que saíram da tela
    this.words = this.words.filter(word => word.position > -100);
  }

  checkCollision(): void {
    const dinoRect = {
      left: this.dinoPosition,
      right: this.dinoPosition + 88,
      top: 300 - this.dinoHeight - 94,
      bottom: 300 - this.dinoHeight
    };

    this.words = this.words.filter((word) => {
      const wordRect = {
        left: word.position,
        right: word.position + (word.value.length * 20),
        top: word.positionType === 'high' ? (100 - this.dinoHeight) : (word.positionType === 'middle' ? 160 : 240),
        bottom: word.positionType === 'high' ? (124 - this.dinoHeight) : (word.positionType === 'middle' ? 184 : 264) // Assuming 24px font size
      };

      if (
        dinoRect.left < wordRect.right &&
        dinoRect.right > wordRect.left &&
        dinoRect.top < wordRect.bottom &&
        dinoRect.bottom > wordRect.top
      ) {
        // Collision detected, play sound and remove the word
        this.wordsCaptured++; // Incrementar contador
        this.lastCapturedWord = word.value; // Atualizar última palavra capturada

        const isRedWord = word.color.toUpperCase() === '#FF0000';
        const isPhrase = word.value.includes(' ');

        if (isRedWord || isPhrase) { // Verifica se a palavra é vermelha ou uma frase
          this.powerupSound.play();
        } else {
          this.coinSound.play();
        }
        
        this.voiceService.speak(word.value);

        // Mostrar o score temporariamente
        this.showScore = true;
        setTimeout(() => {
          this.showScore = false;
        }, 1000); // O score desaparece após 1 segundo

        return false;
      }
      return true;
    });
  }

  updateDinoPosition(deltaTime: number): void {
    if (this.jumping) {
      const jumpSpeed = 0.8; // Aumentado para um pulo mais alto
      this.dinoHeight += jumpSpeed * deltaTime;
      if (this.dinoHeight >= this.jumpHeight) {
        this.dinoHeight = this.jumpHeight;
        this.jumping = false;
      }
    } else if (this.dinoHeight > 0) {
      const fallSpeed = 0.5;
      this.dinoHeight -= fallSpeed * deltaTime;
      if (this.dinoHeight <= 0) {
        this.dinoHeight = 0;
      }
    }
  }

  animateDino(deltaTime: number): void {
    this.lastFrameTime += deltaTime;
    if (this.lastFrameTime >= this.frameDuration) {
      this.currentDinoFrame = (this.currentDinoFrame + 1) % this.dinoFrames.length;
      this.lastFrameTime = 0;
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeydownHandler(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      this.jump();
    } else if (event.code === 'ArrowRight') {
      this.moveDino('forward');
    } else if (event.code === 'ArrowLeft') {
      this.moveDino('backward');
    }
  }

  moveDino(direction: 'forward' | 'backward'): void {
    const step = 10;
    if (direction === 'forward') {
      this.dinoPosition += step;
    } else if (direction === 'backward') {
      this.dinoPosition -= step;
    }
  }

  jump(): void {
    if (!this.gameStarted || this.jumping || this.dinoHeight > 0) return;
    this.jumping = true;
    this.jumpSound.play(); // Tocar som de pulo
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
    }

    this.voiceService.stopListening();

    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
  }

  getDinoStyle(): any {
    return {
      backgroundPosition: this.dinoFrames[this.currentDinoFrame],
      bottom: `${this.dinoHeight}px`,
      left: `${this.dinoPosition}px`
    };
  }
}
