import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { UnifiedVoiceService } from 'src/app/core/services/voice/unified-voice.service';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { AuthService } from '../../pages/auth/login/auth.service';
import { SoundService } from 'src/app/layouts/components/footer/sound.service';

interface PuzzlePiece {
  position: string;
  correctPosition: string;
}

@Component({
  selector: 'quebra-cabeca',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './quebra-cabeca.component.html',
  styleUrls: ['./quebra-cabeca.component.scss']
})
export class QuebraCabecaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  imageUrls = [
    '../../../../assets/img/game/q0.png',
    '../../../../assets/img/game/q1.png',
    '../../../../assets/img/game/q2.png',
    '../../../../assets/img/game/q3.png'
  ];
  imageUrl: string | undefined;
  pieces: PuzzlePiece[] = [];
  isComplete = false;
  gridSize = 4; // 4x4 grid
  completionCount = 0;

  constructor(
    private voiceService: UnifiedVoiceService,
    private soundService: SoundService,
    private db: AngularFireDatabase,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.voiceService.usePreset('simple');
    this.soundService.playBiNeural();
    this.initializePuzzle();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializePuzzle() {
    this.selectRandomImage();
    this.createPuzzlePieces();
    this.shufflePieces();
    this.isComplete = false;
  }

  selectRandomImage() {
    const randomIndex = Math.floor(Math.random() * this.imageUrls.length);
    this.imageUrl = this.imageUrls[randomIndex];
  }

  createPuzzlePieces() {
    this.pieces = [];
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const position = `${x * (100 / (this.gridSize - 1))}% ${y * (100 / (this.gridSize - 1))}%`;
        this.pieces.push({
          position: position,
          correctPosition: position
        });
      }
    }
  }

  shufflePieces() {
    this.pieces.sort(() => Math.random() - 0.5);
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.pieces, event.previousIndex, event.currentIndex);
    this.checkWinCondition();
  }

  checkWinCondition() {
    this.isComplete = this.pieces.every((piece, index) => {
      const correctY = Math.floor(index / this.gridSize);
      const correctX = index % this.gridSize;
      const correctPosition = `${correctX * (100 / (this.gridSize - 1))}% ${correctY * (100 / (this.gridSize - 1))}%`;
      return piece.position === correctPosition;
    });
    if (this.isComplete) {
      this.completionCount++;
      this.saveCompletionCount();
      setTimeout(() => this.initializePuzzle(), 3000); // Restart the puzzle after 3 seconds
    }
  }

  async saveCompletionCount() {
    try {
      const user = await this.authService.getCurrentUser();
      if (user && user.uid) {
        const userId = user.uid;
        this.db.object(`users/${userId}/completionCount`).set(this.completionCount);
      } else {
        console.error('User not found or UID not available');
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  }
  

  resetPuzzle() {
    this.initializePuzzle();
  }
}
